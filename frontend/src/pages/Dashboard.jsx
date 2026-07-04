/**
 * Dashboard.jsx — Executive Security Overview
 *
 * API sources:
 *  - GET /executive-dashboard  → purple_score, detected_attacks, missed_attacks
 *  - GET /security-posture     → security_posture, risk_level
 *  - GET /health               → service health keys
 *  - GET /wazuh/agents         → agent status counts
 *  - GET /mitre-heatmap        → [{technique, count}] used in Exercise Activity chart
 *  - GET /detection-trends     → [{date, detections}] used in Trend chart
 *  - GET /attack-timeline      → [{attack_id, technique_id, attack_name, detected, executed_at}]
 *
 * ZERO hardcoded data. Every value comes from backend APIs.
 * Charts render only when backend returns valid data.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Target, Shield, AlertTriangle, TrendingUp, Activity, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import KpiCard from "../components/ui/KpiCard";
import { CustomTooltip } from "../components/charts/CustomTooltip";
import { PageLoading, ApiError, EmptyState } from "../components/ui/StateComponents";
import {
  getExecutiveDashboard,
  getSecurityPosture,
  getHealth,
  getWazuhAgents,
  getMitreHeatmap,
  getDetectionTrends,
  getAttackTimeline,
} from "../services/api";

const HEALTH_SERVICES = [
  { name: "Wazuh Manager", key: "wazuh" },
  { name: "PostgreSQL", key: "postgres" },
  { name: "SOAR Engine", key: "soar" },
  { name: "Threat Intel", key: "threat_intel" },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── API state — all initialised safely ──────────────────────────────────
  const [dashboard, setDashboard] = useState(null);        // /executive-dashboard
  const [posture, setPosture] = useState(null);            // /security-posture
  const [health, setHealth] = useState({});                // /health
  const [agents, setAgents] = useState([]);                // /wazuh/agents
  const [heatmap, setHeatmap] = useState([]);              // /mitre-heatmap
  const [trendData, setTrendData] = useState([]);          // /detection-trends
  const [timeline, setTimeline] = useState([]);            // /attack-timeline

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getExecutiveDashboard(),   // 0
        getSecurityPosture(),      // 1
        getHealth(),               // 2
        getWazuhAgents(),          // 3
        getMitreHeatmap(),         // 4
        getDetectionTrends(),      // 5
        getAttackTimeline(),       // 6
      ]);

      const [
        dashboardRes,
        postureRes,
        healthRes,
        agentsRes,
        heatmapRes,
        trendsRes,
        timelineRes,
      ] = results;

      if (dashboardRes.status === "fulfilled") setDashboard(dashboardRes.value);
      if (postureRes.status === "fulfilled") setPosture(postureRes.value);
      if (healthRes.status === "fulfilled") setHealth(healthRes.value || {});
      if (agentsRes.status === "fulfilled") {
        const items = agentsRes.value?.data?.affected_items || agentsRes.value || [];
        setAgents(Array.isArray(items) ? items : []);
      }
      if (heatmapRes.status === "fulfilled") {
        setHeatmap(Array.isArray(heatmapRes.value) ? heatmapRes.value : []);
      }
      if (trendsRes.status === "fulfilled") {
        setTrendData(Array.isArray(trendsRes.value) ? trendsRes.value : []);
      }
      if (timelineRes.status === "fulfilled") {
        setTimeline(Array.isArray(timelineRes.value) ? timelineRes.value : []);
      }

      // Consider it an error only if the most critical endpoint failed
      if (dashboardRes.status === "rejected" && postureRes.status === "rejected") {
        setError("Could not reach the backend. Make sure the server is running on port 8000.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  // ── Derived values ───────────────────────────────────────────────────────
  const activeAgents = agents.filter((a) => a.status === "active").length;

  if (loading && !dashboard) return <PageLoading />;
  if (error && !dashboard) return <ApiError message={error} onRetry={loadAll} />;

  return (
    <div className="fade-in">
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.375rem" }}>Security Overview</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          Executive dashboard · {loading ? "Refreshing…" : "Live data"}
        </p>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <KpiCard
          title="Purple Score"
          value={dashboard ? `${dashboard.purple_score ?? 0}%` : "—"}
          subtitle="Real Detection Coverage"
          icon={TrendingUp}
          iconColor="var(--purple-600)"
          iconBg="var(--purple-100)"
        />
        <KpiCard
          title="Detected Attacks"
          value={dashboard?.detected_attacks ?? "—"}
          subtitle="Successfully Detected"
          icon={Shield}
          iconColor="var(--green-600)"
          iconBg="var(--green-50)"
        />
        <KpiCard
          title="Detection Gaps"
          value={dashboard?.missed_attacks ?? "—"}
          subtitle="Undetected Attacks"
          icon={AlertTriangle}
          iconColor="#c2410c"
          iconBg="#fff0e6"
        />
        <KpiCard
          title="Security Posture"
          value={posture?.security_posture ?? "—"}
          subtitle={posture ? `Risk: ${posture.risk_level ?? "N/A"}` : "Awaiting data"}
          icon={Activity}
          iconColor="var(--blue-600)"
          iconBg="var(--blue-50)"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Detection Trends — /detection-trends */}
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Detection Trend</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                Daily detections from database
              </p>
            </div>
          </div>
          {trendData.length === 0 ? (
            <EmptyState
              title="No detection trend data"
              description="Run exercises to populate this chart."
            />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v ? String(v).slice(5) : ""}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="detections"
                  stroke="var(--blue-500)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--blue-500)", r: 3 }}
                  name="Detections"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* MITRE Heatmap — /mitre-heatmap */}
        <div className="card">
          <div className="section-header">
            <div>
              <h3>Technique Activity</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                Attack executions by MITRE technique
              </p>
            </div>
          </div>
          {heatmap.length === 0 ? (
            <EmptyState
              title="No technique data"
              description="Execute attacks to populate this chart."
            />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={heatmap}
                margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                barSize={18}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="technique"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="var(--blue-500)"
                  radius={[4, 4, 0, 0]}
                  name="Executions"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Bottom row: Timeline + Infrastructure ───────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Attack Timeline — /attack-timeline */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div>
              <h3>Attack Timeline</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                Most recent attack executions and detection results
              </p>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {timeline.length} records
            </span>
          </div>

          {timeline.length === 0 ? (
            <EmptyState
              title="No attack history"
              description="Execute attacks via /execute/{technique_id} to see results here."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {timeline.slice(0, 8).map((item, idx) => (
                <div
                  key={item.attack_id ?? idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 0",
                    borderBottom:
                      idx < Math.min(timeline.length, 8) - 1
                        ? "1px solid var(--border-subtle)"
                        : "none",
                  }}
                >
                  {/* Detection badge */}
                  <span
                    className={item.detected ? "badge badge-success" : "badge badge-danger"}
                    style={{ flexShrink: 0, minWidth: 68, justifyContent: "center" }}
                  >
                    {item.detected ? "Detected" : "Missed"}
                  </span>

                  {/* Technique info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.technique_id ?? "—"}
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.attack_name ?? "Unknown technique"}
                    </p>
                  </div>

                  {/* Latency */}
                  {item.latency != null && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {item.latency}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Agent Summary */}
          {agents.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Wazuh Agents</h3>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--green-600)" }}>
                    {activeAgents}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active</p>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {agents.length}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total</p>
                </div>
              </div>
            </div>
          )}

          {/* Infrastructure Status — /health */}
          <div className="card" style={{ flex: 1 }}>
            <div className="section-header" style={{ marginBottom: 14 }}>
              <h3>Infrastructure</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Live · 30s refresh
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {HEALTH_SERVICES.map((svc) => {
                const isUp = health?.[svc.key] !== false;
                return (
                  <div
                    key={svc.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      className={`status-dot ${
                        loading ? "warning" : isUp ? "online" : "offline"
                      } pulse`}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{svc.name}</p>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: loading
                            ? "var(--amber-600)"
                            : isUp
                            ? "var(--green-600)"
                            : "var(--red-500)",
                          fontWeight: 600,
                        }}
                      >
                        {loading ? "Checking…" : isUp ? "Operational" : "Degraded"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
