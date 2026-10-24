/**
 * Helpers for the Inquiries screen: date text, call-round progress and initials.
 *
 * Used by: components/lead/CallEntry.jsx, components/lead/InquiryCard.jsx, pages/InquiriesPage.jsx
 */

/**
 * Short date text; the input itself when it is not a date; "—" when empty.
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return "—";
  const currentDate = new Date(date);
  if (isNaN(currentDate)) return date;
  return currentDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Short date and time text; "" when empty or invalid.
 *
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return "";
  const currentDate = new Date(date);
  if (isNaN(currentDate)) return "";
  return currentDate.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Where an inquiry is in its call rounds (3 calls per round). Example: last call was #3 of round 1
 * -> next is call #1 of round 2.
 *
 * @param {object} lead
 * @returns {{ round: number, nextTouch: number, lastEntry: object|null }}
 */
export function getRemarkProgress(lead) {
  const list = lead.remarkFollowups || [];
  const last = list[list.length - 1];
  if (!last) return { round: 1, nextTouch: 1, lastEntry: null };

  const nextTouch = last.touchNumber < 3 ? last.touchNumber + 1 : 1;
  const round = last.touchNumber < 3 ? last.round : last.round + 1;
  return { round, nextTouch, lastEntry: last };
}

/**
 * Initials of a name without the "Dr." prefix; "?" when empty.
 *
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  const parts = (name || "")
    .replace(/^dr\.?\s*/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}
