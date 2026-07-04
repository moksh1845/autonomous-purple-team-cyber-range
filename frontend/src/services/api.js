/**
 * API Service - Purple Team Cyber Range
 *
 * Single consolidated HTTP client. Every backend call goes through here so
 * there is exactly one place that:
 *   - knows the backend base URL
 *   - attaches the JWT Authorization header
 *   - reacts to 401s by logging the user out
 *
 * Previously this logic was split across this file (fetch-based, no auth
 * header at all) and services/dashboardService.js (a separate axios
 * instance, also with no auth header). Both are now unified here;
 * dashboardService.js re-exports from this file for backward compatibility.
 */

const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "purple_team_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Fired when a request comes back 401 so AuthContext can clear state and
// route the user back to the login screen, no matter which page triggered it.
const AUTH_EXPIRED_EVENT = "purple-team:auth-expired";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(path, res) {
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    throw new Error(`API ${path} returned 401 - session expired`);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.detail ? `: ${body.detail}` : "";
    } catch {
      /* response wasn't JSON - ignore */
    }
    throw new Error(`API ${path} returned ${res.status}${detail}`);
  }
  return res.json();
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(path, res);
}

export function onAuthExpired(callback) {
  window.addEventListener(AUTH_EXPIRED_EVENT, callback);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, callback);
}

// ---------------------------------------------------------------------
// Auth endpoints - unauthenticated (you don't have a token yet)
// ---------------------------------------------------------------------

/** POST /auth/login -> { access_token, token_type } */
export const login = (username, password) =>
  request("/auth/login", { method: "POST", body: { username, password }, auth: false });

/** POST /auth/register -> { message } */
export const register = (username, email, password) =>
  request("/auth/register", {
    method: "POST",
    body: { username, email, password },
    auth: false,
  });

// ---------------------------------------------------------------------
// Read endpoints
// ---------------------------------------------------------------------

export const getExecutiveDashboard = () => request("/executive-dashboard");
export const getPurpleScore = () => request("/purple-score");
export const getScorecard = () => request("/scorecard");
export const getDetectionGaps = () => request("/detection-gaps");
export const getLatencyMetrics = () => request("/latency-metrics");
export const getMitreCoverage = () => request("/mitre-coverage");
export const getMitreHeatmap = () => request("/mitre-heatmap");
export const getSecurityPosture = () => request("/security-posture");
export const getAttackTimeline = () => request("/attack-timeline");
export const getDetectionTrends = () => request("/detection-trends");
export const getHealth = () => request("/health", { auth: false });
export const getReport = () => request("/report");
export const getRiskScore = () => request("/risk-score");
export const getDashboardFull = () => request("/dashboard/full");
export const getAttackHistory = () => request("/attack-history");
export const getDetectionHistory = () => request("/detection-history");
export const getWazuhAgents = () => request("/wazuh/agents");
export const getWazuhAlerts = () => request("/wazuh/alerts");
export const getWazuhLiveAlerts = () => request("/wazuh/live-alerts");
export const getCoverage = () => request("/coverage");
export const getMitreMatrix = () => request("/mitre-matrix");
export const getTechniques = () => request("/techniques");
export const getAttacks = () => request("/attacks");
export const getDetections = () => request("/detections");
export const getSimulations = () => request("/simulations");
export const getAuditLogs = () => request("/audit-logs");
export const getMitreCorrelation = (technique) => request(`/correlate/${technique}`);

// ---------------------------------------------------------------------
// Write endpoints (require Admin / Purple Team Lead role on the backend -
// the backend itself enforces this; the frontend additionally hides/disables
// the triggering UI for users without the role, see ProtectedAction.jsx)
// ---------------------------------------------------------------------

/** POST /simulate -> { success, attack_id, technique_id, technique_name } */
export const runSimulation = (techniqueId) =>
  request("/simulate", { method: "POST", body: { technique_id: techniqueId } });

/** POST /execute/{technique_id} */
export const executeTechnique = (techniqueId) =>
  request(`/execute/${techniqueId}`, { method: "POST" });
