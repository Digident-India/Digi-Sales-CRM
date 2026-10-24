/**
 * Helpers for the Admin page: stage colours, agent colours and initials, grouping leads into
 * batches, and date / time-ago text.
 *
 * Used by: components/agent/AgentChip.jsx, pages/AdminPage.jsx
 */

export const STAGE_META = {
  inquiry: { label: "Inquiry", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)" },
  followup: { label: "Follow-up", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.12)" },
  client: { label: "Client", color: "#4ade80", bg: "rgba(74, 222, 128, 0.12)" },
  flag: { label: "Flagged", color: "#f87171", bg: "rgba(248, 113, 113, 0.12)" },
};

// Stable, distinct color per agent name so their leads are easy to scan
// without repeating the name on every line.
const AGENT_PALETTE = [
  "#60a5fa",
  "#4ade80",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#2dd4bf",
  "#fb923c",
  "#f87171",
];

/**
 * A stable colour per agent name, so one agent's leads are easy to spot.
 *
 * @param {string} name
 * @returns {string} CSS colour.
 */
export function colorForAgent(name) {
  if (!name) return "var(--text-ghost)";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AGENT_PALETTE[hash % AGENT_PALETTE.length];
}

/**
 * Initials of a name, e.g. "Ravi Kumar" -> "RK"; "?" when empty.
 *
 * @param {string} name
 * @returns {string}
 */
export function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0].toUpperCase();
}

/**
 * Who added the lead (first assignment entry), or "System".
 *
 * @param {object} lead
 * @returns {string}
 */
export function addedByOf(lead) {
  return lead.assignmentHistory?.[0]?.transferredByName || "System";
}

export const NEW_WINDOW_MS = 24 * 60 * 60 * 1000; // a lead counts as "NEW" for its first 24h only

const GROUP_GAP_MS = 3 * 60 * 1000; // leads from the same agent within 3 min count as one batch

export const GROUP_PAGE_SIZE = 8;

export const BATCH_EXPAND_STEP = 25; // how many rows a batch reveals at a time when expanded

/**
 * Collapses consecutive leads added by the same person within GROUP_GAP_MS (3 minutes) into one
 * batch, e.g. one Excel import.
 *
 * Collapse consecutive same-agent leads (e.g. one Excel import of 3000 rows) into a single batch
 * group.
 *
 * @param {object[]} sortedLeads Leads sorted by createdAt.
 * @returns {Array<{ key: string, addedBy: string, leads: object[], minTime: number, maxTime: number
 * }>}
 */
export function buildLeadGroups(sortedLeads) {
  const groups = [];
  let current = null;
  let lastTime = null;
  for (const lead of sortedLeads) {
    const addedBy = addedByOf(lead);
    const time = new Date(lead.createdAt).getTime();
    if (
      current &&
      current.addedBy === addedBy &&
      lastTime !== null &&
      Math.abs(time - lastTime) <= GROUP_GAP_MS
    ) {
      current.leads.push(lead);
      current.minTime = Math.min(current.minTime, time);
      current.maxTime = Math.max(current.maxTime, time);
    } else {
      current = {
        key: `${addedBy}__${time}`,
        addedBy,
        leads: [lead],
        minTime: time,
        maxTime: time,
      };
      groups.push(current);
    }
    lastTime = time;
  }
  return groups;
}

/**
 * Source label for a batch: "Excel Import", "Manual" or "Mixed", with its colour.
 *
 * @param {object[]} leads
 * @returns {{ label: string, color: string }}
 */
export function groupSourceSummary(leads) {
  const hasExcel = leads.some((lead) => lead.source === "excel");
  const hasManual = leads.some((lead) => lead.source !== "excel");
  if (hasExcel && hasManual) return { label: "Mixed", color: "#a78bfa" };
  if (hasExcel) return { label: "Excel Import", color: "#60a5fa" };
  return { label: "Manual", color: "#4ade80" };
}

/**
 * Current owner of a batch: the agent's name, or "N agents" when the leads were reassigned to
 * different agents.
 *
 * Leads in a batch can end up with different current owners after reassignment, so this collapses
 * to one name if they all still match, otherwise flags it as split.
 *
 * @param {object[]} leads
 * @returns {{ label: string, mixed: boolean }}
 */
export function groupAssigneeSummary(leads) {
  const names = new Set(leads.map((lead) => lead.assignedAgent || "Unassigned"));
  if (names.size === 1) return { label: [...names][0], mixed: false };
  return { label: `${names.size} agents`, mixed: true };
}

/**
 * Date text, e.g. "05 Mar 2026"; "—" when empty or invalid.
 *
 * @param {string|Date} currentDate
 * @returns {string}
 */
export function formatDate(currentDate) {
  if (!currentDate) return "—";
  const date = new Date(currentDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Time text, e.g. "4:30 pm"; "" when empty or invalid.
 *
 * @param {string|Date} timestamp
 * @returns {string}
 */
export function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * Relative time, e.g. "5m ago", "3h ago", or the date for older entries.
 *
 * @param {string|Date} timestamp
 * @returns {string}
 */
export function timeAgo(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}
