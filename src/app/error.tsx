"use client";

/**
 * Route-level error boundary.
 *
 * Catches errors thrown while rendering a specific route segment and shows the
 * error message + stack in the browser (and console.error) instead of an empty
 * 500. Pairs with app/global-error.tsx, which handles errors in the root layout.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[RouteError]", error);

  const stack = error?.stack ?? "";
  const message = error?.message ?? "Unknown error";
  const digest = error?.digest;

  return (
    <div
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        margin: 0,
        padding: "24px",
        background: "#0b0b0f",
        color: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#ff6b6b", fontSize: "20px" }}>Something went wrong</h1>
      <p style={{ color: "#ffd166" }}>{message}</p>
      {digest ? <p style={{ color: "#888" }}>Digest: {digest}</p> : null}
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
    </div>
  );
}
