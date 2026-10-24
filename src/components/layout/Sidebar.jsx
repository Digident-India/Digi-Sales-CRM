/**
 * Left navigation: pipeline stages and screens (admin links only for admins), with live counts.
 *
 * Used by: routes/AppRoutes.jsx
 */

import { useCrm } from "../../context/CrmContext";
import { ROLE_LABELS } from "../../constants/UserRoles";
import { NAVIGATION_LINKS, ADMIN_NAVIGATION_LINKS } from "../../constants/NavigationLinks";

export default function Sidebar({ active, onNav, onLogout, isOpen, onClose }) {
  const { counts, dashboard, user, isAdmin } = useCrm();

  const navItems = isAdmin ? [...NAVIGATION_LINKS, ...ADMIN_NAVIGATION_LINKS] : NAVIGATION_LINKS;

  // Backend login response shape is { id, name, email, role, ... } —
  // there is no separate firstName/lastName, so derive both from `name`.
  const nameParts = (user?.name || "").trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length
    ? (nameParts[0][0] + (nameParts[1]?.[0] || "")).toUpperCase()
    : "AG";
  const displayName = user?.name || user?.email || "Agent";
  const roleLabel = user?.role !== undefined ? ROLE_LABELS[user.role] : "";

  const handleNav = (id) => {
    onNav(id);
    onClose?.();
  };

  return (
    <>
      <div className={`sidebar-backdrop${isOpen ? " open" : ""}`} onClick={onClose} />

      <aside
        className={`sidebar${isOpen ? " sidebar-open" : ""}`}
        style={{
          width: 240,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              background: "var(--orange)",
              borderRadius: 9,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ToothIcon />
          </div>
          <div>
            <div
              style={{
                fontWeight: 900,
                color: "var(--text-white)",
                fontSize: 14,
                letterSpacing: ".12em",
              }}
            >
              DIGIDENT
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--orange)",
                fontWeight: 700,
                letterSpacing: ".2em",
              }}
            >
              CRM PORTAL
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} title="Close menu">
            ✕
          </button>
        </div>

        <nav style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
          <p
            style={{
              fontSize: 9,
              color: "var(--text-ghost)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              padding: "0 8px",
              marginBottom: 8,
            }}
          >
            Pipeline Stages
          </p>
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  transition: "all .2s",
                  textAlign: "left",
                  outline: "none",
                  border: isActive ? `1px solid ${item.ring}` : "1px solid transparent",
                  background: isActive ? item.dim : "none",
                  color: isActive ? "#fb8430" : "var(--text-muted)",
                }}
                onMouseEnter={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background = "rgba(255,255,255,.04)";
                    event.currentTarget.style.color = "#aaa";
                  }
                }}
                onMouseLeave={(event) => {
                  if (!isActive) {
                    event.currentTarget.style.background = "none";
                    event.currentTarget.style.color = "var(--text-muted)";
                  }
                }}
              >
                <span>
                  <span style={{ color: "var(--text-ghost)", marginRight: 5 }}>{item.n}.</span>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: item.dim,
                      color: item.accent,
                    }}
                  >
                    {counts[item.badge]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          style={{
            margin: "0 12px 12px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-dim)",
            borderRadius: 10,
            padding: 12,
          }}
        >
          <p
            style={{
              fontSize: 9,
              color: "var(--text-ghost)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              marginBottom: 10,
            }}
          >
            Overview
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            {[
              { l: "Leads", v: dashboard?.inquiry ?? counts.inquiry, c: "var(--orange)" },
              { l: "Active", v: dashboard?.followup ?? counts.followup, c: "var(--yellow)" },
              { l: "Clients", v: dashboard?.client ?? counts.client, c: "var(--green)" },
              { l: "Upcoming", v: dashboard?.upcomingCount ?? 0, c: "#3B82F6" },
            ].map((stat) => (
              <div key={stat.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: stat.c }}>{stat.v}</div>
                <div
                  style={{
                    fontSize: 8,
                    color: "var(--text-ghost)",
                    textTransform: "uppercase",
                    letterSpacing: ".07em",
                    marginTop: 1,
                  }}
                >
                  {stat.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "var(--orange)",
                borderRadius: 8,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 900,
                color: "#fff",
              }}
            >
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div
                className="truncate"
                style={{ fontSize: 11, fontWeight: 700, color: "var(--text-white)", maxWidth: 110 }}
              >
                {displayName}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-dim)" }}>
                {roleLabel || "Active Terminal"}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              cursor: "pointer",
              padding: 6,
              borderRadius: 6,
              transition: "color .2s",
              flexShrink: 0,
            }}
            onMouseEnter={(event) => (event.currentTarget.style.color = "var(--red)")}
            onMouseLeave={(event) => (event.currentTarget.style.color = "var(--text-dim)")}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

function ToothIcon() {
  return (
    <svg width="17" height="17" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  );
}
