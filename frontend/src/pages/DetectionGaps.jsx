/**
 * DetectionGaps.jsx — Detection Gap Analysis
 *
 * API source: GET /detection-gaps
 * Returns: {
 *   executed_attacks: number,
 *   detected_attacks: number,
 *   missed_attacks: number,
 *   coverage: number,
 *   total_techniques: number,
 *   gaps: [{ technique_id, technique_name, tactic, tested, detected, status }]
 * }
 * status is one of "Covered" | "Gap" | "Not Tested" — one row per MITRE
 * technique (not per attack execution), matching the real backend in
 * services/detection_gap.py.
 *
 * ZERO hardcoded data. All previous fake gap records, pieData, tacticData
 * have been removed. Charts render only when backend returns valid data.
 * Severity field does not exist in the backend schema — removed.
 */

import { useEffect, useState, useCallback } from "react";
import { Search, AlertTriangle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { CustomTooltip } from "../components/charts/CustomTooltip";
import { PageLoading, ApiError, EmptyState } from "../components/ui/StateComponents";
import { getDetectionGaps } from "../services/api";

const STATUS_CONFIG = {
  Gap: {
    label: "Gap",
    color: "var(--red-600)",
    bg: "var(--red-50)",
    badgeClass: "badge-critical",
    icon: AlertTriangle,
  },
  Covered: {
    label: "Covered",
    color: "var(--green-600)",
    bg: "var(--green-50)",
    badgeClass: "badge-success",
    icon: CheckCircle,
  },
  "Not Tested": {
    label: "Not Tested",
    color: "var(--blue-600)",
    bg: "var(--blue-50)",
    badgeClass: "badge-info",
    icon: Clock,
  },
};

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] ||
    STATUS_CONFIG["Not Tested"]
  );
}

export default function DetectionGaps() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gapData, setGapData] = useState(null);   // full /detection-gaps response
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadGaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDetectionGaps();
      setGapData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGaps();
  }, [loadGaps]);

  if (loading && !gapData) return <PageLoading />;
  if (error && !gapData) return <ApiError message={error} onRetry={loadGaps} />;

  // ── Derived data ─────────────────────────────────────────────────────────
  const gaps = Array.isArray(gapData?.gaps) ? gapData.gaps : [];
  const executedAttacks = gapData?.executed_attacks ?? 0;
  const detectedAttacks = gapData?.detected_attacks ?? 0;
  const missedAttacks = gapData?.missed_attacks ?? 0;
  const coveragePct = gapData?.coverage ?? 0;

  // Pie chart: detected vs not detected
  const pieData = [
    { name: "Not Detected", value: missedAttacks, color: "var(--red-500)" },
    { name: "Detected", value: detectedAttacks, color: "var(--green-500)" },
  ].filter((d) => d.value > 0);

  // Tactic breakdown of real Gaps (only undetected, tested techniques) —
  // grouping by technique_id doesn't make sense here since the backend
  // already returns one row per technique (every count would be 1);
  // grouping by tactic is the meaningful aggregate.
  const gapsByTactic = gaps
    .filter((g) => g.status === "Gap")
    .reduce((acc, g) => {
      const key = g.tactic || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  const techniqueChartData = Object.entries(gapsByTactic)
    .map(([technique, count]) => ({ technique, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Filtered table rows
  const filteredGaps = gaps.filter((g) => {
    const matchSearch =
      !search ||
      (g.technique_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (g.technique_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ||
      (g.status || "Not Tested") === statusFilter;
    return matchSearch && matchStatus;
  });

  // Unique statuses in this dataset for the filter dropdown
  const uniqueStatuses = [...new Set(gaps.map((g) => g.status || "Not Tested"))];

  return (
    <div className="fade-in">
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.375rem" }}>Detection Gap Analysis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
            Undetected attack executions — sourced from{" "}
            <code style={{ fontSize: "0.8em" }}>/detection-gaps</code>
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={loadGaps}
          disabled={loading}
          style={{ gap: 7 }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Summary tiles ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Executed Attacks",
            value: executedAttacks,
            color: "var(--text-primary)",
          },
          {
            label: "Detected",
            value: detectedAttacks,
            color: "var(--green-600)",
          },
          {
            label: "Missed (Gaps)",
            value: missedAttacks,
            color: "var(--red-500)",
          },
          {
            label: "Coverage",
            value: `${coveragePct}%`,
            color:
              coveragePct >= 75
                ? "var(--green-600)"
                : coveragePct >= 50
                ? "var(--amber-600)"
                : "var(--red-500)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              {s.label}
            </span>
            <span
              style={{
                fontSize: "1.625rem",
                fontWeight: 700,
                color: s.color,
                letterSpacing: "-0.02em",
              }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {(pieData.length > 0 || techniqueChartData.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: techniqueChartData.length > 0 ? "280px 1fr" : "1fr",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Pie: detected vs missed */}
          {pieData.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 4 }}>Detection Ratio</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8 }}>
                Detected vs undetected attacks
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {pieData.map((d) => (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: d.color,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {d.name}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar: gaps by tactic */}
          {techniqueChartData.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 4 }}>Gaps by Tactic</h3>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Undetected techniques grouped by MITRE tactic
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={techniqueChartData}
                  margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                  barSize={20}
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
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="var(--red-400)"
                    radius={[4, 4, 0, 0]}
                    name="Gaps"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Gaps table ────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Toolbar */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              className="input"
              style={{ paddingLeft: 32, height: 36, fontSize: "0.8125rem" }}
              placeholder="Search by technique or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {uniqueStatuses.length > 1 && (
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: 36 }}
            >
              <option value="all">All Status</option>
              {uniqueStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginLeft: "auto" }}>
            {filteredGaps.length} gap{filteredGaps.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        {filteredGaps.length === 0 ? (
          <EmptyState
            title={
              gaps.length === 0
                ? "No detection gaps found"
                : "No results for current filters"
            }
            description={
              gaps.length === 0
                ? "All executed attacks were detected, or no attacks have been executed yet."
                : "Adjust the search or status filter."
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Technique</th>
                <th>Name</th>
                <th>Tactic</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGaps.map((gap) => {
                const sc = getStatusConfig(gap.status || "Not Tested");
                const StatusIcon = sc.icon;
                return (
                  <tr key={gap.technique_id}>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {gap.technique_id || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                      {gap.technique_name || "—"}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                      {gap.tactic || "—"}
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <StatusIcon size={13} color={sc.color} />
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: sc.bg,
                            color: sc.color,
                          }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        {filteredGaps.length > 0 && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Showing {filteredGaps.length} of {gaps.length} gaps · Coverage: {coveragePct}%
            </span>
            {/* Coverage progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                Detection coverage
              </span>
              <div
                className="progress-bar"
                style={{ width: 120 }}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${coveragePct}%`,
                    background:
                      coveragePct >= 75
                        ? "var(--green-500)"
                        : coveragePct >= 50
                        ? "var(--amber-500)"
                        : "var(--red-500)",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  minWidth: 36,
                }}
              >
                {coveragePct}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}