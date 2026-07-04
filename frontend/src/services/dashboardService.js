/**
 * DEPRECATED - kept only so any external script importing from this file
 * keeps working. All real logic now lives in services/api.js, which is the
 * single authenticated HTTP client for the whole app. This file used to be
 * a second, separate axios instance with no auth header at all, duplicating
 * getWazuhAgents/getWazuhAlerts that already existed in api.js.
 */

export { getWazuhAgents, getWazuhAlerts, getMitreCorrelation } from "./api";
