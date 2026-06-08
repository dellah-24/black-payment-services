// Minimal Sentry wrapper for browser usage. Configure SENTRY_DSN in env.
// @ts-ignore - optional dependency
import * as Sentry from '@sentry/browser';

interface BrowserOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  integrations?: unknown[];
  beforeSend?: (event: unknown, hint: unknown) => unknown | null;
}

const init = (dsn?: string, options: Partial<BrowserOptions> = {}) => {
  if (!dsn) return;
  try {
    Sentry.init({ dsn, ...options } as BrowserOptions);
  } catch (e) {
    // Sentry not available
  }
};

const captureException = async (error: Error, meta?: Record<string, unknown>) => {
  try {
    const eventId = Sentry.captureException(error, { extra: meta });
    return eventId as string;
  } catch (e) {
    return undefined;
  }
};

const addBreadcrumb = (crumb: { message: string; data?: Record<string, unknown> }) => {
  try {
    Sentry.addBreadcrumb({ message: crumb.message, data: crumb.data });
  } catch (e) {
    // ignore
  }
};

export default {
  init,
  captureException,
  addBreadcrumb,
};
