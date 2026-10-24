/**
 * Sidebar menu entries (screen key, label, icon) for agents and for admins.
 *
 * The sidebar is built from these arrays. To add, rename or reorder a menu item,
 * edit this file only — no JSX changes needed.
 * id = the page key used by routes/AppRoutes.jsx, badge = key in CrmContext counts.
 *
 * Used by: components/layout/Sidebar.jsx
 */

export const NAVIGATION_LINKS = [
  {
    id: "analytics",
    n: "1",
    label: "Analytics",
    badge: null,
    accent: "var(--green)",
    dim: "var(--bg-card)",
    ring: "var(--green-ring)",
  },
  {
    id: "inquiries",
    n: "2",
    label: "Raw Inquiries",
    badge: "inquiry",
    accent: "var(--orange)",
    dim: "var(--orange-dim)",
    ring: "var(--orange-ring)",
  },
  {
    id: "flags",
    n: "3",
    label: "Flagged Entries",
    badge: "flag",
    accent: "var(--red)",
    dim: "var(--red-dim)",
    ring: "var(--red-ring)",
  },
  {
    id: "followups",
    n: "4",
    label: "Follow-Up Funnel",
    badge: "followup",
    accent: "var(--yellow)",
    dim: "var(--yellow-dim)",
    ring: "var(--yellow-ring)",
  },
  {
    id: "clients",
    n: "5",
    label: "Client Book",
    badge: "client",
    accent: "var(--green)",
    dim: "var(--green-dim)",
    ring: "var(--green-ring)",
  },
  {
    id: "invoices",
    n: "6",
    label: "Invoices",
    badge: "invoice",
    accent: "#60A5FA",
    dim: "rgba(96,165,250,.12)",
    ring: "rgba(96,165,250,.35)",
  },
  {
    id: "credit-notes",
    n: "7",
    label: "Credit Notes",
    badge: null,
    accent: "#ea580c",
    dim: "rgba(234,88,12,.12)",
    ring: "rgba(234,88,12,.35)",
  },
];

// Admin-only nav items — appended conditionally, not in the base array,
// so agents never see them rendered even for a flash before role resolves.
export const ADMIN_NAVIGATION_LINKS = [
  {
    id: "agents",
    n: "8",
    label: "Agents / Admin",
    badge: null,
    accent: "#A78BFA",
    dim: "rgba(167,139,250,.12)",
    ring: "rgba(167,139,250,.35)",
  },
  {
    id: "agent-performance",
    n: "9",
    label: "Agent Performance",
    badge: null,
    accent: "#A78BFA",
    dim: "rgba(167,139,250,.12)",
    ring: "rgba(167,139,250,.35)",
  },
];
