"use client";

/**
 * Global error boundary.
 *
 * Catches errors thrown anywhere in the React tree (including during SSR of
 * the root layout) and renders the error details directly in the browser so
 * that a 500 is no longer a blank/empty response. This is the primary way to
 * "forward every stage to the browser console" — the message and stack are
 * shown on the page and also logged via console.error (visible in DevTools).
 *
 * NOTE: This only catches errors that occur inside the Next.js request
 * lifecycle. A Worker-level crash that happens before routing (e.g. a module
 * that throws at import time) will still return an empty 500; for those, check
 * the Cloudflare Workers logs (the instrumentation.ts uncaughtException /
 * unhandledRejection handlers log the full stack there).
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Surface the error in the browser console as well as on the page.
  console.error("[GlobalError]", error);

  const stack = error?.stack ?? "";
  const message = error?.message ?? "Unknown error";
  const digest = error?.digest;

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          margin: 0,
          padding: "24px",
          background: "#0b0b0f",
          color: "#f5f5f5",
        }}
      >
        <h1 style={{ color: "#ff6b6b", fontSize: "20px" }}>
          Application error
        </h1>
        <p style={{ color: "#ffd166" }}>{message}</p>
        {digest ? (
          <p style={{ color: "#888" }}>Digest: {digest}</p>
        ) : null}
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "#16161c",
            border: "1px solid #2a2a33",
            borderRadius: "8px",
            padding: "16px",
            fontSize: "12px",
            lineHeight: 1.5,
            overflowX: "auto",
          }}
        >
          {stack || message}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
