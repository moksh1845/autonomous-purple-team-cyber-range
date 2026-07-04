import { useState } from "react";
import { User, Bell, Shield, Server, Key, ChevronRight, Check } from "lucide-react";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Server },
  { id: "api", label: "API Keys", icon: Key },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    email_alerts: true,
    gap_detected: true,
    score_change: true,
    report_ready: true,
    simulation_complete: false,
  });
  const [integrations, setIntegrations] = useState({
    wazuh: { enabled: true, host: "localhost", port: "55000" },
    postgres: { enabled: true, host: "localhost", port: "5432" },
    slack: { enabled: false, webhook: "" },
    jira: { enabled: false, url: "" },
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.375rem" }}>Settings</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          Configure platform preferences and integrations
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
        {/* Nav */}
        <div className="card" style={{ padding: "12px 8px", height: "fit-content" }}>
          {sections.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  cursor: "pointer",
                  background: active ? "var(--blue-50)" : "transparent",
                  color: active ? "var(--blue-700)" : "var(--text-secondary)",
                  fontWeight: active ? 600 : 400,
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  width: "100%",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <Icon size={15} />
                {s.label}
                {active && <ChevronRight size={13} style={{ marginLeft: "auto" }} />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="card">
          {activeSection === "profile" && (
            <div>
              <h3 style={{ marginBottom: 20 }}>Profile Settings</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {[
                  { label: "First Name", value: "SOC" },
                  { label: "Last Name", value: "Analyst" },
                  { label: "Email", value: "soc@company.com" },
                  { label: "Role", value: "Security Analyst" },
                  { label: "Team", value: "Purple Team" },
                  { label: "Organization", value: "ACME Security" },
                ].map((f) => (
                  <div key={f.label}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                      {f.label}
                    </label>
                    <input className="input" defaultValue={f.value} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div>
              <h3 style={{ marginBottom: 6 }}>Notification Preferences</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 24 }}>
                Control which events trigger notifications
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {Object.entries({
                  email_alerts: "Email Alerts",
                  gap_detected: "New Detection Gap Found",
                  score_change: "Purple Score Changes",
                  report_ready: "Report Generated",
                  simulation_complete: "Simulation Complete",
                }).map(([key, label]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>{label}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Notify via email and in-app
                      </p>
                    </div>
                    <button
                      onClick={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        width: 44,
                        height: 24,
                        borderRadius: 999,
                        border: "none",
                        cursor: "pointer",
                        background: notifications[key] ? "var(--blue-600)" : "var(--bg-surface-3)",
                        position: "relative",
                        transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: "white",
                          top: 3,
                          left: notifications[key] ? 23 : 3,
                          transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <div>
              <h3 style={{ marginBottom: 6 }}>Integrations</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 24 }}>
                Connect external services and security tools
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {Object.entries(integrations).map(([key, cfg]) => (
                  <div
                    key={key}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-surface-2)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: cfg.enabled ? 14 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={`status-dot ${cfg.enabled ? "online" : "offline"}`} />
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", textTransform: "capitalize" }}>{key}</span>
                      </div>
                      <button
                        onClick={() => setIntegrations((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))}
                        className={`btn ${cfg.enabled ? "btn-secondary" : "btn-primary"}`}
                        style={{ fontSize: "0.75rem", padding: "5px 12px" }}
                      >
                        {cfg.enabled ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                    {cfg.enabled && (cfg.host || cfg.webhook || cfg.url) && (
                      <div style={{ display: "grid", gridTemplateColumns: cfg.port ? "1fr 120px" : "1fr", gap: 10 }}>
                        <div>
                          <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                            {cfg.host !== undefined ? "Host" : cfg.webhook !== undefined ? "Webhook URL" : "URL"}
                          </label>
                          <input
                            className="input"
                            style={{ fontSize: "0.8125rem", height: 34 }}
                            defaultValue={cfg.host || cfg.webhook || cfg.url}
                          />
                        </div>
                        {cfg.port !== undefined && (
                          <div>
                            <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Port</label>
                            <input className="input" style={{ fontSize: "0.8125rem", height: 34 }} defaultValue={cfg.port} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div>
              <h3 style={{ marginBottom: 20 }}>Security Settings</h3>
              {[
                { label: "Current Password", type: "password", placeholder: "Enter current password" },
                { label: "New Password", type: "password", placeholder: "Enter new password" },
                { label: "Confirm Password", type: "password", placeholder: "Confirm new password" },
              ].map((f) => (
                <div key={f.label} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{f.label}</label>
                  <input className="input" type={f.type} placeholder={f.placeholder} />
                </div>
              ))}
              <div style={{ padding: "14px 16px", background: "var(--bg-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>Two-Factor Authentication</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Adds extra security to your account</p>
                  </div>
                  <span className="badge badge-success">Enabled</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div>
              <h3 style={{ marginBottom: 6 }}>API Keys</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 20 }}>
                Manage API keys for programmatic access
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { name: "Production Key", created: "Jun 1, 2026", last_used: "Today" },
                  { name: "CI/CD Pipeline", created: "May 15, 2026", last_used: "2 days ago" },
                ].map((key) => (
                  <div key={key.name} style={{ padding: "14px 16px", background: "var(--bg-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{key.name}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                        Created {key.created} · Last used {key.last_used}
                      </p>
                      <p className="mono" style={{ marginTop: 6, color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        pt_••••••••••••••••••••••••••••••
                      </p>
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: "0.75rem" }}>Revoke</button>
                  </div>
                ))}
                <button className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                  <Key size={13} /> Generate New Key
                </button>
              </div>
            </div>
          )}

          {/* Save button (for applicable sections) */}
          {["profile", "notifications", "security", "integrations"].includes(activeSection) && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSave}>
                {saved ? <><Check size={14} /> Saved!</> : "Save Changes"}
              </button>
              <button className="btn btn-secondary">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
