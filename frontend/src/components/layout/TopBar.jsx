import { useState } from "react";
import { Search, Bell, ChevronRight, User, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const breadcrumbs = {
  dashboard: ["Home", "Dashboard"],
  exercises: ["Home", "Exercises"],
  simulations: ["Home", "Simulations"],
  gaps: ["Home", "Detection Gaps"],
  score: ["Home", "Purple Score"],
  reports: ["Home", "Reports"],
  settings: ["Home", "Settings"],
};

export default function TopBar({ activePage }) {
  const [searchVal, setSearchVal] = useState("");
  const { username, role, logout } = useAuth();
  const crumbs = breadcrumbs[activePage] || ["Home"];

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        left: 0,
        height: "var(--topbar-height)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px 0 0",
        gap: 16,
        zIndex: 99,
        paddingLeft: "calc(var(--sidebar-width) + 28px)",
        transition: "padding-left 0.25s ease",
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
        {crumbs.map((crumb, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {i > 0 && <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />}
            <span
              style={{
                fontSize: "0.8125rem",
                color: i === crumbs.length - 1 ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
              }}
            >
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", width: 260 }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          className="input"
          style={{ paddingLeft: 32, height: 36, fontSize: "0.8125rem" }}
          placeholder="Search exercises, techniques..."
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
        />
      </div>

      {/* Notification */}
      <button
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-surface-2)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "var(--bg-surface)"}
      >
        <Bell size={15} />
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--red-500)",
            border: "2px solid white",
          }}
        />
      </button>

      {/* User Avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "6px 10px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--blue-600), var(--purple-600))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <User size={13} color="white" />
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {username || "Unknown User"}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {role || "No Role"}
          </div>
        </div>
        <button
          onClick={logout}
          title="Log out"
          style={{
            marginLeft: 4,
            width: 28,
            height: 28,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--red-50)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
        >
          <LogOut size={13} />
        </button>
      </div>
    </header>
  );
}
