/**
 * Shared UI primitives for loading, error, and empty states.
 * Used across all pages — no hardcoded data anywhere.
 */

export function LoadingSpinner({ size = 20 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid var(--border)`,
        borderTop: `2px solid var(--blue-600)`,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export function PageLoading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "80px 0",
        color: "var(--text-muted)",
        fontSize: "0.875rem",
      }}
    >
      <LoadingSpinner />
      <span>Loading data…</span>
    </div>
  );
}

export function ApiError({ message, onRetry }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: "var(--red-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
        }}
      >
        ⚠
      </div>
      <div>
        <p style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Unable to load data
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          {message || "Backend may be unavailable. Check that the server is running on port 8000."}
        </p>
      </div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "No data available", description }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <span style={{ fontSize: "1.5rem", opacity: 0.4 }}>—</span>
      <p style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{title}</p>
      {description && (
        <p style={{ fontSize: "0.8125rem" }}>{description}</p>
      )}
    </div>
  );
}

/** Inline loading skeleton for KPI values */
export function SkeletonText({ width = 60, height = 28 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-surface-3)",
        animation: "shimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}
