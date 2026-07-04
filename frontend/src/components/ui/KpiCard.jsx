export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "var(--blue-600)",
  iconBg = "var(--blue-50)",
  trend,
  trendUp,
  accent,
}) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        transition: "box-shadow 0.2s, transform 0.2s",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: accent,
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {title}
          </p>
          <h2
            style={{
              fontSize: "1.875rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginTop: 4,
              lineHeight: 1,
            }}
          >
            {value}
          </h2>
          {subtitle && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 5 }}>
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={iconColor} />
          </div>
        )}
      </div>

      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: trendUp ? "var(--green-600)" : "var(--red-500)",
              background: trendUp ? "var(--green-50)" : "var(--red-50)",
              padding: "2px 7px",
              borderRadius: "999px",
            }}
          >
            {trendUp ? "▲" : "▼"} {trend}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>vs last month</span>
        </div>
      )}
    </div>
  );
}
