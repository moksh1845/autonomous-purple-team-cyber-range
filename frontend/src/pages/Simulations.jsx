import { useState, useEffect } from "react";
import { Play, RefreshCw, Terminal, CheckCircle, Clock, AlertCircle, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CustomTooltip } from "../components/charts/CustomTooltip";
import { getTechniques, getSimulations, runSimulation as apiRunSimulation } from "../services/api";
import ProtectedAction from "../components/auth/ProtectedAction";

// TODO: Replace with backend coverage endpoint when available
// coverageData is intentionally omitted — do not use hardcoded values here.

const statusIcon = {
  success: <CheckCircle size={13} color="var(--green-600)" />,
  failed: <AlertCircle size={13} color="var(--red-500)" />,
  running: <RefreshCw size={13} color="var(--blue-600)" style={{ animation: "spin 1.5s linear infinite" }} />,
  gap: <AlertCircle size={13} color="var(--red-500)" />,
  simulated: <Clock size={13} color="var(--amber-600)" />,
};

const statusBadge = {
  success: "success",
  failed: "critical",
  running: "info",
  gap: "critical",
  simulated: "medium",
};

export default function Simulations() {
  const [techniques, setTechniques] = useState([]);
  const [tactics, setTactics] = useState([]);
  const [selectedTactic, setSelectedTactic] = useState(null);
  const [selectedTechnique, setSelectedTechnique] = useState(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [recentSimulations, setRecentSimulations] = useState([]);

  useEffect(() => {
    loadTechniques();
    loadSimulations();
  }, []);

  const loadTechniques = async () => {
    try {
      const data = await getTechniques();
      setTechniques(data);

      // Build unique tactics list from API response, preserving order of first appearance
      const seen = new Set();
      const uniqueTactics = [];
      for (const t of data) {
        if (t.tactic && !seen.has(t.tactic)) {
          seen.add(t.tactic);
          uniqueTactics.push(t.tactic);
        }
      }
      setTactics(uniqueTactics);

      // Auto-select the first tactic if none is selected
      if (!selectedTactic && uniqueTactics.length > 0) {
  setSelectedTactic(uniqueTactics[0]);
}
    } catch (error) {
      console.error("Failed to load techniques:", error);
    }
  };

  const loadSimulations = async () => {
    try {
      const data = await getSimulations();
      setRecentSimulations(data);
    } catch (error) {
      console.error("Failed to load simulations:", error);
    }
  };

  // Derive available techniques by filtering on selected tactic
  const availableTechniques = techniques.filter(
    (t) => t.tactic === selectedTactic
  );

  // Build coverage data dynamically from techniques state
  // TODO: Replace with backend coverage endpoint when available
  const coverageData = tactics.map((tactic) => {
    const total = techniques.filter((t) => t.tactic === tactic).length;
    return {
      tactic: tactic.length > 10 ? tactic.slice(0, 9) + "…" : tactic,
      covered: 0,   // TODO: replace with real covered count from backend
      total,
    };
  });

  const runSimulation = async () => {
    if (!selectedTechnique || running) return;

    setRunning(true);
    setLog([
      `[*] Starting simulation for ${selectedTechnique.technique_id} — ${selectedTechnique.technique_name}`,
      `[*] Sending request to simulation engine...`,
    ]);

    try {
      const data = await apiRunSimulation(selectedTechnique.technique_id);

      if (data.success) {
        const det = data.detection || {};
        const lines = [
          `[*] Starting simulation for ${selectedTechnique.technique_id} — ${selectedTechnique.technique_name}`,
          `[*] Sending request to simulation engine...`,
          `[+] Attack registered — attack_id: ${data.attack_id}`,
          `[+] Technique: ${data.technique_id} — ${data.technique_name}`,
        ];

        if (det.mode === "live") {
          lines.push(`[*] Correlating against real Wazuh alert data...`);
          if (det.detected) {
            lines.push(
              `[+] DETECTED — rule_id: ${det.rule_id ?? "n/a"}, source: ${det.source ?? "n/a"}, latency: ${det.latency_seconds ?? "n/a"}s`
            );
          } else {
            lines.push(
              `[-] NOT DETECTED — no matching Wazuh alert found in the correlation window. This technique is currently a detection Gap.`
            );
          }
        } else if (det.mode === "simulated") {
          lines.push(
            `[!] No live Wazuh data available to correlate against — result is simulated, not a real detection claim.`
          );
          if (det.reason) lines.push(`[!] ${det.reason}`);
        } else {
          lines.push(`[+] Simulation completed.`);
        }

        setLog(lines);
      } else {
        setLog([
          `[*] Starting simulation for ${selectedTechnique.technique_id} — ${selectedTechnique.technique_name}`,
          `[*] Sending request to simulation engine...`,
          `[-] Simulation failed: ${data.message || "Unknown error"}`,
        ]);
      }
    } catch (error) {
      setLog([
        `[*] Starting simulation for ${selectedTechnique.technique_id} — ${selectedTechnique.technique_name}`,
        `[*] Sending request to simulation engine...`,
        `[!] Error: ${error.message}`,
      ]);
    } finally {
      setRunning(false);
      await loadSimulations();
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.375rem" }}>Attack Simulations</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          Execute MITRE ATT&CK technique simulations and validate detections
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Simulation builder */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={15} color="var(--blue-600)" />
            </div>
            <h3>Simulation Builder</h3>
          </div>

          {/* Tactic selector */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
              Select Tactic
            </label>
            {tactics.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "12px 0" }}>
                No tactics available. Add techniques to the database to get started.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tactics.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setSelectedTactic(t); setSelectedTechnique(null); }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 500,
                      transition: "all 0.15s",
                      borderColor: selectedTactic === t ? "var(--blue-500)" : "var(--border)",
                      background: selectedTactic === t ? "var(--blue-50)" : "var(--bg-surface)",
                      color: selectedTactic === t ? "var(--blue-700)" : "var(--text-secondary)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Technique selector */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
              Select Technique
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {availableTechniques.map((t) => (
                <button
                  key={t.technique_id}
                  onClick={() => setSelectedTechnique(t)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    transition: "all 0.15s",
                    borderColor: selectedTechnique?.technique_id === t.technique_id ? "var(--blue-500)" : "var(--border)",
                    background: selectedTechnique?.technique_id === t.technique_id ? "var(--blue-50)" : "var(--bg-surface-2)",
                  }}
                >
                  <span className="mono" style={{ fontSize: "0.75rem", color: "var(--blue-600)", fontWeight: 600, minWidth: 48 }}>
                    {t.technique_id}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-primary)" }}>{t.technique_name}</span>
                </button>
              ))}
              {availableTechniques.length === 0 && selectedTactic && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "12px 0" }}>
                  No techniques configured for this tactic.
                </p>
              )}
            </div>
          </div>

          <ProtectedAction allowedRoles={["Admin", "Purple Team Lead"]}>
            <button
              className="btn btn-primary"
              style={{ marginTop: "auto", justifyContent: "center", opacity: !selectedTechnique || running ? 0.6 : 1 }}
              onClick={runSimulation}
              disabled={!selectedTechnique || running}
            >
              {running
                ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Running...</>
                : <><Play size={14} /> Execute Simulation</>
              }
            </button>
          </ProtectedAction>
        </div>

        {/* Terminal output */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Terminal size={14} color="#94a3b8" />
            </div>
            <h3>Execution Output</h3>
            {running && (
              <span className="badge badge-info" style={{ marginLeft: "auto" }}>
                <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> Live
              </span>
            )}
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 260,
              background: "#0f172a",
              borderRadius: "var(--radius-md)",
              padding: 16,
              fontFamily: "'DM Mono', monospace",
              fontSize: "0.75rem",
              lineHeight: 1.7,
              color: "#94a3b8",
              overflowY: "auto",
            }}
          >
            {log.length === 0 ? (
              <span style={{ color: "#475569" }}>
                {selectedTechnique
                  ? `Ready to execute ${selectedTechnique.technique_id} — ${selectedTechnique.technique_name}`
                  : "Select a tactic and technique to begin..."}
              </span>
            ) : (
              log.map((line, i) => {
                let color = "#94a3b8";
                if (line.startsWith("[+]") && line.includes("DETECTED") && !line.includes("NOT DETECTED")) {
                  color = "#34d399"; // green — real detection confirmed
                } else if (line.includes("NOT DETECTED") || line.startsWith("[-]")) {
                  color = "#f87171"; // red — gap / failure
                } else if (line.startsWith("[!]")) {
                  color = "#fbbf24"; // amber — simulated / no live data to check
                } else if (i === log.length - 1) {
                  color = "#94a3b8";
                }
                return (
                  <div key={i} style={{ color }}>
                    {line}
                  </div>
                );
              })
            )}
            {running && <span style={{ color: "#3b82f6" }}>▌</span>}
          </div>
        </div>
      </div>

      {/* Coverage chart + Recent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <h3 style={{ marginBottom: 4 }}>Tactic Coverage</h3>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 16 }}>
            Techniques covered vs total per tactic
          </p>
          {/* TODO: Replace coverageData.covered with real values from a backend coverage endpoint */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={coverageData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="tactic" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="covered" fill="var(--blue-500)" radius={[4, 4, 0, 0]} name="Covered" />
              <Bar dataKey="total" fill="var(--bg-surface-3)" radius={[4, 4, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "20px 20px 12px" }}>
            <h3>Recent Simulations</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Technique</th>
                <th>Status</th>
                <th>Time</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {recentSimulations.map((sim) => (
                <tr key={sim.id}>
                  <td>
                    <p className="primary" style={{ fontSize: "0.8125rem" }}>{sim.technique_name}</p>
                    <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{sim.technique_id}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {statusIcon[sim.status] || <Clock size={13} />}
                      <span className={`badge badge-${statusBadge[sim.status] || "info"}`} style={{ fontSize: "0.7rem" }}>
                        {sim.status}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: "0.75rem" }}>
                    {sim.started_at ? new Date(sim.started_at).toLocaleTimeString() : "—"}
                  </td>
                  <td>
                    {sim.confidence !== null && sim.confidence !== undefined ? (
                      <span style={{ fontWeight: 600, color: sim.confidence > 70 ? "var(--green-600)" : "var(--red-500)" }}>
                        {sim.confidence}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {recentSimulations.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem", padding: "20px 0" }}>
                    No simulations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}