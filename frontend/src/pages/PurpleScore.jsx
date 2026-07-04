/**
 * PurpleScore.jsx — Purple Team Effectiveness Score
 *
 * API sources:
 *  - GET /purple-score     → purple_score, detection_rate, total_attacks, detected_attacks, missed_attacks
 *  - GET /scorecard        → coverage_percentage, detection_rate, average_latency, purple_team_score
 *  - GET /latency-metrics  → average_latency, minimum_latency, maximum_latency, total_detections
 *  - GET /mitre-coverage   → total_techniques, executed_techniques, coverage
 *
 * ZERO hardcoded data. Score history, team comparison, and score components
 * have been removed — no backend API exists for those values.
 */

import { useEffect, useState, useCallback } from "react";
import { Shield, Target, Clock, TrendingUp, AlertTriangle, Activity } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { CustomTooltip } from "../components/charts/CustomTooltip";
import { PageLoading, ApiError, EmptyState } from "../components/ui/StateComponents";
import {
  getPurpleScore,
  getScorecard,
  getLatencyMetrics,
  getMitreCoverage,
} from "../services/api";

/** Circular score ring drawn with SVG — value 0–100. */
function ScoreRing({ score }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(Math.max(score, 0), 100) / 100) * circ;
  const color =
    score >= 80
      ? "var(--green-500)"
      : score >= 60
      ? "var(--blue-500)"
      : score >= 40
      ? "var(--amber-500)"
      : "var(--red-500)";
  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";

  return (
    <div
      style={{
        position: "relative",
        width: 180,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={180} height={180} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={90} cy={90} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={12}
        />
        <circle
          cx={90} cy={90} r={r}
          fill="none"
          stroke={color}
          strokeWidth={12}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div
          style={{
            fontSize: "2.75rem",
            fontWeight: 800,
            color: "white",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {score}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/** Single metric tile inside the scorecard grid. */
function MetricTile({ label, value, subValue, icon: Icon, color, bg }) {
  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </p>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={color} />
        </div>
      </div>
      <div>
        <p
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {subValue && (
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PurpleScore() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scoreData, setScoreData] = useState(null);       // /purple-score
  const [scorecard, setScorecard] = useState(null);       // /scorecard
  const [latency, setLatency] = useState(null);           // /latency-metrics
  const [coverage, setCoverage] = useState(null);         // /mitre-coverage

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getPurpleScore(),
        getScorecard(),
        getLatencyMetrics(),
        getMitreCoverage(),
      ]);

      const [scoreRes, scorecardRes, latencyRes, coverageRes] = results;

      if (scoreRes.status === "fulfilled") setScoreData(scoreRes.value);
      if (scorecardRes.status === "fulfilled") setScorecard(scorecardRes.value);
      if (latencyRes.status === "fulfilled") setLatency(latencyRes.value);
      if (coverageRes.status === "fulfilled") setCoverage(coverageRes.value);

      if (
        scoreRes.status === "rejected" &&
        scorecardRes.status === "rejected"
      ) {
        setError("Unable to load Purple Score. Ensure the backend is running on port 8000.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading && !scoreData) return <PageLoading />;
  if (error && !scoreData) return <ApiError message={error} onRetry={loadAll} />;

  // ── Derived display values ────────────────────────────────────────────────
  const currentScore = Math.round(scoreData?.purple_score ?? scorecard?.purple_team_score ?? 0);
  const detectionRate = scoreData?.detection_rate ?? scorecard?.detection_rate ?? 0;
  const totalAttacks = scoreData?.total_attacks ?? 0;
  const detectedAttacks = scoreData?.detected_attacks ?? 0;
  const missedAttacks = scoreData?.missed_attacks ?? 0;
  const coveragePct = scorecard?.coverage_percentage ?? coverage?.coverage ?? 0;
  const avgLatency = latency?.average_latency ?? scorecard?.average_latency ?? 0;
  const minLatency = latency?.minimum_latency ?? 0;
  const maxLatency = latency?.maximum_latency ?? 0;
  const totalDetections = latency?.total_detections ?? detectedAttacks;
  const totalTechniques = coverage?.total_techniques ?? 0;
  const executedTechniques = coverage?.executed_techniques ?? 0;

  // Bar chart: show the key metrics as a visual breakdown
  const chartData = [
    { name: "Detection Rate", value: Math.round(detectionRate) },
    { name: "Coverage", value: Math.round(coveragePct) },
    { name: "Purple Score", value: currentScore },
  ].filter((d) => d.value > 0);

  const scoreGrade =
    currentScore >= 80
      ? "Excellent"
      : currentScore >= 60
      ? "Good"
      : currentScore >= 40
      ? "Fair"
      : "Poor";

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.375rem" }}>Purple Score</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          Composite security effectiveness score — sourced from live backend data
        </p>
      </div>

      {/* ── Hero score banner ──────────────────────────────────────────────── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1e1b4b 50%, #312e81 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "40px 48px",
          marginBottom: 24,
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 250,
            height: 250,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        />

        <ScoreRing score={currentScore} />

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={16} color="white" />
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                opacity: 0.7,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Purple Team Security Score
            </span>
          </div>

          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 400,
              opacity: 0.85,
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            Detection rate is{" "}
            <strong>{Math.round(detectionRate)}%</strong> across{" "}
            <strong>{totalAttacks}</strong> attack executions.{" "}
            {missedAttacks > 0
              ? `${missedAttacks} attack${missedAttacks !== 1 ? "s" : ""} went undetected.`
              : totalAttacks === 0
              ? "Run exercises to generate score data."
              : "All executed attacks were detected."}
          </h2>

          <div style={{ display: "flex", gap: 32 }}>
            {[
              { label: "Total Attacks", value: totalAttacks },
              { label: "Detected", value: detectedAttacks },
              { label: "Missed", value: missedAttacks },
            ].map((s) => (
              <div key={s.label}>
                <p
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.6,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color:
                      s.label === "Missed" && s.value > 0 ? "#f87171" : "white",
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Grade badge */}
        <div
          style={{
            textAlign: "center",
            padding: "20px 32px",
            background: "rgba(255,255,255,0.07)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontSize: "2.5rem" }}>
            {currentScore >= 80 ? "🟢" : currentScore >= 60 ? "🔵" : currentScore >= 40 ? "🟡" : "🔴"}
          </div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginTop: 8 }}>
            {scoreGrade}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: 4 }}>
            Score Grade
          </div>
        </div>
      </div>

      {/* ── Metric tiles ───────────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MetricTile
          label="Detection Rate"
          value={`${Math.round(detectionRate)}%`}
          subValue={`${detectedAttacks} of ${totalAttacks} attacks`}
          icon={Shield}
          color="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <MetricTile
          label="MITRE Coverage"
          value={`${Math.round(coveragePct)}%`}
          subValue={
            totalTechniques > 0
              ? `${executedTechniques} of ${totalTechniques} techniques`
              : "No techniques registered"
          }
          icon={Target}
          color="var(--purple-600)"
          bg="var(--purple-100)"
        />
        <MetricTile
          label="Avg Latency"
          value={avgLatency > 0 ? `${avgLatency}s` : "—"}
          subValue={
            minLatency > 0 || maxLatency > 0
              ? `Min ${minLatency}s · Max ${maxLatency}s`
              : "No latency data"
          }
          icon={Clock}
          color="var(--green-600)"
          bg="var(--green-50)"
        />
        <MetricTile
          label="Total Detections"
          value={totalDetections}
          subValue={`${missedAttacks} detection gaps`}
          icon={Activity}
          color="var(--amber-600)"
          bg="var(--amber-50)"
        />
      </div>

      {/* ── Score chart ────────────────────────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Score Breakdown</h3>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 20 }}>
          Key metrics contributing to the Purple Score — live values
        </p>
        {chartData.length === 0 ? (
          <EmptyState
            title="No score data available"
            description="Execute attacks and record detections to build your score."
          />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
              barSize={36}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Bar
                dataKey="value"
                fill="var(--purple-500)"
                radius={[6, 6, 0, 0]}
                name="Score"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
