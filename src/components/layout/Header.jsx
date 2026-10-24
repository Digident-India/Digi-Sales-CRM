/**
 * Top bar of the CRM with the "Log Inquiry" button and the current user.
 *
 * Used by: routes/AppRoutes.jsx
 */

import { useState, useEffect } from "react";
import { useCrm } from "../../context/CrmContext";

export default function Header({ onAddInquiry, onMenuToggle }) {
  const { search, setSearch } = useCrm();
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const [dark, setDark] = useState(() => localStorage.getItem("crm-theme") !== "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("crm-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <header
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Hamburger — visible only on mobile via CSS */}
      <button className="hamburger-btn" onClick={onMenuToggle} title="Open menu">
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search */}
      <div className="search-bar-wrap" style={{ position: "relative", width: 300 }}>
        <svg
          style={{
            position: "absolute",
            left: 11,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-dim)",
            pointerEvents: "none",
          }}
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search…"
          className="input"
          style={{ paddingLeft: 34, paddingRight: 14 }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span
          className="header-date"
          style={{ fontSize: 10, color: "var(--text-ghost)", fontFamily: "monospace" }}
        >
          {today}
        </span>
        <div
          className="header-date"
          style={{ width: 1, height: 20, background: "var(--border)" }}
        />

        {/* Theme toggle */}
        <button
          className="theme-btn"
          onClick={() => setDark((prevDark) => !prevDark)}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? (
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                strokeLinecap="round"
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
              />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              />
            </svg>
          )}
        </button>

        <button onClick={onAddInquiry} className="btn btn-primary" style={{ fontSize: 11, gap: 5 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
          <span className="desktop-only" style={{ display: "inline" }}>
            Log Inquiry
          </span>
        </button>
      </div>
    </header>
  );
}
