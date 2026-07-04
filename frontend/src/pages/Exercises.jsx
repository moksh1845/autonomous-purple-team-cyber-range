import { useState } from "react";
import { Plus, Search, Filter, Play, CheckCircle, Clock, XCircle, ChevronRight, Target } from "lucide-react";

const exercises = [
  {
    id: "EX-001",
    name: "Credential Dumping Exercise",
    technique: "T1003",
    tactic: "Credential Access",
    status: "completed",
    score: 92,
    detections: 8,
    gaps: 1,
    date: "Jun 8, 2026",
    duration: "2h 14m",
    team: "Red Team Alpha",
  },
  {
    id: "EX-002",
    name: "Lateral Movement Simulation",
    technique: "T1021",
    tactic: "Lateral Movement",
    status: "in_progress",
    score: null,
    detections: 4,
    gaps: 3,
    date: "Jun 9, 2026",
    duration: "Active",
    team: "Red Team Beta",
  },
  {
    id: "EX-003",
    name: "Command & Control Beacon",
    technique: "T1071",
    tactic: "Command and Control",
    status: "completed",
    score: 74,
    detections: 6,
    gaps: 4,
    date: "Jun 7, 2026",
    duration: "3h 40m",
    team: "Red Team Alpha",
  },
  {
    id: "EX-004",
    name: "Data Exfiltration via DNS",
    technique: "T1048",
    tactic: "Exfiltration",
    status: "failed",
    score: 41,
    detections: 2,
    gaps: 7,
    date: "Jun 6, 2026",
    duration: "1h 55m",
    team: "Red Team Beta",
  },
  {
    id: "EX-005",
    name: "Process Injection Test",
    technique: "T1055",
    tactic: "Defense Evasion",
    status: "scheduled",
    score: null,
    detections: null,
    gaps: null,
    date: "Jun 10, 2026",
    duration: "—",
    team: "Red Team Alpha",
  },
  {
    id: "EX-006",
    name: "Network Recon & Port Scan",
    technique: "T1046",
    tactic: "Discovery",
    status: "completed",
    score: 88,
    detections: 9,
    gaps: 2,
    date: "Jun 5, 2026",
    duration: "1h 20m",
    team: "Red Team Gamma",
  },
];

const statusConfig = {
  completed: { label: "Completed", icon: CheckCircle, color: "var(--green-600)", bg: "var(--green-50)", badge: "success" },
  in_progress: { label: "In Progress", icon: Clock, color: "var(--blue-600)", bg: "var(--blue-50)", badge: "info" },
  failed: { label: "Failed", icon: XCircle, color: "var(--red-500)", bg: "var(--red-50)", badge: "critical" },
  scheduled: { label: "Scheduled", icon: Clock, color: "var(--amber-600)", bg: "var(--amber-50)", badge: "medium" },
};

export default function Exercises() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = exercises.filter((ex) => {
    const matchSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.technique.toLowerCase().includes(search.toLowerCase()) ||
      ex.tactic.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || ex.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: exercises.length,
    completed: exercises.filter((e) => e.status === "completed").length,
    active: exercises.filter((e) => e.status === "in_progress").length,
    avgScore: Math.round(
      exercises.filter((e) => e.score).reduce((s, e) => s + e.score, 0) /
        exercises.filter((e) => e.score).length
    ),
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.375rem" }}>Purple Team Exercises</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
            Plan, execute, and review attack simulation exercises
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus size={15} /> New Exercise
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Exercises", value: stats.total, color: "var(--blue-600)" },
          { label: "Completed", value: stats.completed, color: "var(--green-600)" },
          { label: "Active Now", value: stats.active, color: "var(--amber-600)" },
          { label: "Avg Score", value: `${stats.avgScore}%`, color: "var(--purple-600)" },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{s.label}</span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color, letterSpacing: "-0.02em" }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="input"
              style={{ paddingLeft: 32, height: 36, fontSize: "0.8125rem" }}
              placeholder="Search exercises, techniques..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: 36 }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
            <option value="scheduled">Scheduled</option>
          </select>

          <button className="btn btn-secondary" style={{ height: 36 }}>
            <Filter size={13} /> Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginTop: 16 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Technique</th>
              <th>Status</th>
              <th>Score</th>
              <th>Detections</th>
              <th>Gaps</th>
              <th>Date</th>
              <th>Duration</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ex) => {
              const s = statusConfig[ex.status];
              const Icon = s.icon;
              return (
                <tr key={ex.id} style={{ cursor: "pointer" }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--radius-md)",
                          background: "var(--blue-50)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Target size={14} color="var(--blue-600)" />
                      </div>
                      <div>
                        <p className="primary" style={{ fontSize: "0.8125rem" }}>{ex.name}</p>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{ex.id} · {ex.team}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="chip mono">{ex.technique}</span>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 3 }}>{ex.tactic}</p>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon size={13} color={s.color} />
                      <span style={{ fontSize: "0.8125rem", color: s.color, fontWeight: 500 }}>{s.label}</span>
                    </div>
                  </td>
                  <td>
                    {ex.score !== null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="progress-bar" style={{ width: 60 }}>
                          <div
                            className="progress-fill"
                            style={{
                              width: `${ex.score}%`,
                              background: ex.score >= 80 ? "var(--green-500)" : ex.score >= 60 ? "var(--amber-500)" : "var(--red-500)",
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--text-primary)" }}>
                          {ex.score}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    {ex.detections !== null ? (
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{ex.detections}</span>
                    ) : "—"}
                  </td>
                  <td>
                    {ex.gaps !== null ? (
                      <span
                        style={{
                          fontWeight: 600,
                          color: ex.gaps > 4 ? "var(--red-500)" : ex.gaps > 2 ? "var(--amber-600)" : "var(--green-600)",
                        }}
                      >
                        {ex.gaps}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{ex.date}</td>
                  <td>{ex.duration}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "6px 8px", fontSize: "0.75rem" }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Showing {filtered.length} of {exercises.length} exercises
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className="btn btn-secondary"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  justifyContent: "center",
                  background: p === 1 ? "var(--blue-600)" : undefined,
                  color: p === 1 ? "white" : undefined,
                  border: p === 1 ? "none" : undefined,
                  fontSize: "0.8125rem",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
