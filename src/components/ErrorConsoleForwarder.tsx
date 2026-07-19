"use client";

/**
 * ErrorConsoleForwarder
 *
 * Installs global client-side error listeners and forwards every error /
 * unhandled promise rejection to the browser console (console.error) so that
 * failures are visible in DevTools "Console" regardless of where they occur.
 *
 * Browsers already log window.onerror natively, but this component makes the
 * forwarding explicit and consistent, tags messages with a clear prefix, and
 * ensures rejected promises (which are otherwise easy to miss) are surfaced.
 */

import { useEffect } from "react";

export function ErrorConsoleForwarder() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const err = event.error ?? event;
      console.error("[client:error]", event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: err?.stack ?? err,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      console.error(
        "[client:unhandledrejection]",
        reason?.stack ?? reason?.message ?? reason
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
