/**
 * Asks the backend to hand out unassigned leads to agents and rebalance untouched ones.
 *
 * Used by: context/CrmContext.jsx
 * API: leadsApi.distributeUnassigned, leadsApi.rebalanceUntouched
 */

import { leadsApi } from "../backend/ApiService.js";

const COOLDOWN_MS = 5000;

let lastDistributeAt = 0;
let distributeInFlight = null;

let lastRebalanceAt = 0;
let rebalanceInFlight = null;

/**
 * Asks the backend to hand unassigned leads to agents. At most once per cooldown; parallel calls
 * share one request.
 *
 * @returns {Promise<object>} The response, { skipped: true } inside the cooldown, or { error }.
 */
export async function triggerDistribute() {
  const now = Date.now();
  if (distributeInFlight) return distributeInFlight;
  if (now - lastDistributeAt < COOLDOWN_MS) return { skipped: true };

  lastDistributeAt = now;
  distributeInFlight = leadsApi
    .distributeUnassigned()
    .catch((err) => {
      console.error("Auto-distribute failed:", err.message);
      return { error: err.message };
    })
    .finally(() => {
      distributeInFlight = null;
    });

  return distributeInFlight;
}

/**
 * Asks the backend to rebalance untouched leads between agents. At most once per cooldown; parallel
 * calls share one request.
 *
 * @returns {Promise<object>} The response, { skipped: true } inside the cooldown, or { error }.
 */
export async function triggerRebalance() {
  const now = Date.now();
  if (rebalanceInFlight) return rebalanceInFlight;
  if (now - lastRebalanceAt < COOLDOWN_MS) return { skipped: true };

  lastRebalanceAt = now;
  rebalanceInFlight = leadsApi
    .rebalanceUntouched()
    .catch((err) => {
      console.error("Auto-rebalance failed:", err.message);
      return { error: err.message };
    })
    .finally(() => {
      rebalanceInFlight = null;
    });

  return rebalanceInFlight;
}
