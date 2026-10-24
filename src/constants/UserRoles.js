/**
 * Employee role numbers (USER_ROLES) and their display names (ROLE_LABELS).
 *
 * Used by: 6 files (shared), e.g. components/agent/AgentDetail.jsx, components/layout/Sidebar.jsx,
 * pages/AdminPage.jsx
 */

export const USER_ROLES = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  MANAGER: 2,
  EXECUTIVE: 3, // Fixed spelling
  AGENT: 4,
};

export const ROLE_LABELS = {
  0: "Super Admin",
  1: "Admin",
  2: "Manager",
  3: "Executive", // Fixed spelling
  4: "Agent",
};
