/**
 * Reports.jsx — Executive Reports
 *
 * API source: GET /report
 * Returns: {
 *   report_name, generated_at,
 *   summary: { total_attacks, total_detections, detection_rate,
 *               coverage_percentage, average_latency, purple_team_score },
 *   top_techniques: [{ technique_id, executions }]
 * }
 *
 * ZERO hardcoded data. Previous static report list, monthly activity data,
 * and fabricated statistics have all been removed.
 * The page shows the live snapshot from the backend's /report endpoint.
 */

import { useEffect, useState, useCallback } from "react";
import {
  FileText, Download, RefreshCw, Shield, AlertTriangle,
  Target, Clock, TrendingUp, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { CustomTooltip } from "../components/charts/CustomTooltip";
import { PageLoading, ApiError, EmptyState } from "../components/ui/StateComponents";
import { getReport } from "../services/api";

/** Format an ISO date string to a human-readable form. */
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReport();
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (loading && !report) return <PageLoading />;
  if (error && !report) return <ApiError message={error} onRetry={loadReport} />;

  const summary = report?.summary ?? {};
  const topTechniques = Array.isArray(report?.top_techniques) ? report.top_techniques : [];

  const summaryTiles = [
    {
      label: "Total Attacks",
      value: summary.total_attacks ?? "—",
      icon: Target,
      color: "var(--blue-600)",
      bg: "var(--blue-50)",
    },
    {
      label: "Total Detections",
      value: summary.total_detections ?? "—",
      icon: Shield,
      color: "var(--green-600)",
      bg: "var(--green-50)",
    },
    {
      label: "Detection Rate",
      value: summary.detection_rate != null ? `${summary.detection_rate}%` : "—",
      icon: TrendingUp,
      color: "var(--purple-600)",
      bg: "var(--purple-100)",
    },
    {
      label: "Coverage",
      value: summary.coverage_percentage != null ? `${summary.coverage_percentage}%` : "—",
      icon: Activity,
      color: "var(--cyan-500)",
      bg: "var(--cyan-100)",
    },
    {
      label: "Avg Latency",
      value: summary.average_latency != null ? `${summary.average_latency}s` : "—",
      icon: Clock,
      color: "var(--amber-600)",
      bg: "var(--amber-50)",
    },
    {
      label: "Purple Score",
      value: summary.purple_team_score != null ? `${summary.purple_team_score}%` : "—",
      icon: Shield,
      color: "var(--red-600)",
      bg: "var(--red-50)",
    },
    {
      label: "Missed Attacks",
      value: summary.missed_attacks ?? "—",
      icon: AlertTriangle,
      color: "#c2410c",
      bg: "#fff0e6",
    },
  ];

  return (
    <div className="fade-in">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.375rem" }}>Executive Report</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
            Live security assessment snapshot from the backend
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadReport}
          disabled={loading}
          style={{ gap: 7 }}
        >
          <RefreshCw
            size={13}
            style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }}
          />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Report card ───────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "32px 36px",
          marginBottom: 24,
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 40,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative ring */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        />

        {/* File icon */}
        <div
          style={{
            width: 80,
            height: 100,
            background: "rgba(255,255,255,0.08)",
            borderRadius: "var(--radius-md)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <FileText size={28} color="rgba(255,255,255,0.7)" />
          <span
            style={{
              position: "absolute",
              bottom: 8,
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            JSON
          </span>
        </div>

        {/* Report meta */}
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Live Report
          </span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: 6, marginBottom: 16 }}>
            {report?.report_name ?? "Purple Team Assessment Report"}
          </h2>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { icon: Clock,      label: "Generated",  value: formatDate(report?.generated_at) },
              { icon: Target,     label: "Attacks",    value: summary.total_attacks ?? "—" },
              { icon: Shield,     label: "Detections", value: summary.total_detections ?? "—" },
              {
                icon: TrendingUp,
                label: "Score",
                value: summary.purple_team_score != null ? `${summary.purple_team_score}%` : "—",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: 4,
                    }}
                  >
                    <Icon size={12} />
                    <span
                      style={{
                        fontSize: "0.7rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {String(item.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Download JSON button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn"
            style={{
              background: "white",
              color: "#1e1b4b",
              fontWeight: 600,
              justifyContent: "center",
              gap: 7,
            }}
            onClick={() => {
              if (!report) {
                alert("Report data not loaded");
                return;
              }
              const blob = new Blob([JSON.stringify(report, null, 2)], {
                type: "application/json",
              });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `purple-team-report-${Date.now()}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} /> Download JSON
          </button>
        </div>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {summaryTiles.slice(0, 4).map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="card"
              style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-md)",
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={16} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.label}</p>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Detailed Metrics + Top Techniques ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: topTechniques.length > 0 ? "1fr 1fr" : "1fr",
          gap: 20,
        }}
      >
        {/* Detailed Metrics */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Detailed Metrics</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {summaryTiles.slice(4).map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 14,
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "var(--radius-sm)",
                        background: s.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={14} color={s.color} />
                    </div>
                    <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {s.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {s.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Techniques chart */}
        {topTechniques.length > 0 ? (
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Most-Used Techniques</h3>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: 16,
              }}
            >
              Attack executions per MITRE technique
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topTechniques}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                barSize={16}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="technique_id"
                  tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="executions"
                  fill="var(--blue-500)"
                  radius={[0, 4, 4, 0]}
                  name="Executions"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Most-Used Techniques</h3>
            <EmptyState
              title="No technique data"
              description="Execute attacks to see top techniques."
            />
          </div>
        )}
      </div>

    </div>
  );
}
