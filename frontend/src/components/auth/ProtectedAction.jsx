import { useAuth } from "../../context/AuthContext";

/**
 * Wraps an action (button, form, etc.) that requires one of `allowedRoles`
 * on the backend. The backend is the real enforcement point (RBAC via
 * require_role) — this component only prevents Viewer-role users from
 * clicking a button that the API will reject anyway with a 403, and shows
 * them why instead of a confusing failed request.
 */
export default function ProtectedAction({ allowedRoles, children, fallback = null }) {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    return (
      fallback ?? (
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
            padding: "8px 12px",
            background: "var(--bg-surface-2)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          Requires {allowedRoles.join(" or ")} role. Your role:{" "}
          <strong>{role || "Unknown"}</strong>
        </div>
      )
    );
  }

  return children;
}
