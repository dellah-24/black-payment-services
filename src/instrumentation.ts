/**
 * Next.js Instrumentation
 * 
 * This file is automatically loaded by Next.js when the server starts.
 * We use it to start the background payment monitor.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

let posthogLoggerInitialized = false;

// NOTE: OpenTelemetry packages are imported lazily (inside registerPostHogLogger)
// rather than at the top level. Importing them at the module top level pulls a
// large CJS dependency graph into the OpenNext Cloudflare worker bundle, and
// several of those modules call `module.require(...)` at evaluation time. In the
// workerd ESM runtime `module` is undefined, which throws
// "TypeError: Cannot read properties of undefined (reading 'require')" and takes
// the whole worker down. Lazy imports keep them out of the worker's top-level
// module graph unless PostHog logging is actually enabled.
async function registerPostHogLogger() {
  if (posthogLoggerInitialized) return;

  const authToken = process.env.POSTHOG_LOGS_AUTH_TOKEN;
  if (!authToken) {
    console.log('[Instrumentation] PostHog logs disabled (POSTHOG_LOGS_AUTH_TOKEN not set)');
    return;
  }

  try {
    const { OTLPLogExporter } = await import('@opentelemetry/exporter-logs-otlp-http');
    const { resourceFromAttributes } = await import('@opentelemetry/resources');
    const { LoggerProvider, SimpleLogRecordProcessor } = await import('@opentelemetry/sdk-logs');

    const serviceName = process.env.POSTHOG_LOGS_SERVICE_NAME || 'tempesttouch';
    const exporter = new OTLPLogExporter({
      url: process.env.POSTHOG_LOGS_OTLP_URL || 'https://us.i.posthog.com/otlp/v1/logs',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const loggerProvider = new LoggerProvider({
      resource: resourceFromAttributes({
        'service.name': serviceName,
        'deployment.environment': process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || 'unknown',
      }),
      processors: [new SimpleLogRecordProcessor(exporter)],
    });

    (globalThis as any).__posthogLogger = loggerProvider.getLogger(serviceName);
    (globalThis as any).__posthogLoggerProvider = loggerProvider;
    posthogLoggerInitialized = true;
    console.log('[Instrumentation] PostHog logs enabled');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Instrumentation] Failed to initialize PostHog logger:', message);
    // Do not throw — PostHog logging is optional and should not crash the worker
  }
}

/**
 * Time-bounded, non-blocking PostHog logger initialization.
 *
 * Fires the registration in the background and resolves after a short timeout
 * so that `register()` does not block on optional telemetry setup.
 */
async function registerPostHogLoggerNonBlocking(): Promise<void> {
  // Start registration in the background
  const registrationPromise = registerPostHogLogger();

  // Wait up to 2 seconds for it to complete; if it takes longer, proceed anyway
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(resolve, 2000);
  });

  await Promise.race([registrationPromise, timeoutPromise]);
}

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Always install global error handlers so that Worker-level crashes
    // (including the empty 500s seen on static assets like /icons/favicon.png)
    // log their full stack to the Cloudflare Workers log instead of failing
    // silently. This is the server-side source of truth for debugging.
    process.on('uncaughtException', (err) => {
      console.error('[FATAL] Uncaught exception (caught by handler):', err?.message || err);
      console.error(err?.stack || '');
      // Don't exit — let the server keep running
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[FATAL] Unhandled rejection (caught by handler):', reason);
    });

    // Non-blocking: do not await PostHog logger — it runs in the background
    registerPostHogLoggerNonBlocking().catch((err) => {
      console.error('[Instrumentation] PostHog logger registration failed:', err);
    });

    const enableBackgroundMonitor = process.env.ENABLE_BACKGROUND_MONITOR === 'true';
    if (!enableBackgroundMonitor) {
      console.log('[Instrumentation] Background monitor disabled (ENABLE_BACKGROUND_MONITOR != true)');
      return;
    }

    console.log('[Instrumentation] Starting background services...');
    
    // Dynamically import to avoid issues with client-side bundling
    const { startMonitor } = await import('./lib/payments/monitor');
    
    // Start the payment monitor
    startMonitor();
    
    console.log('[Instrumentation] Background services started');
  }
}
