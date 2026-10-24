/**
 * Small label + value tile on the Agent Performance page.
 *
 * Used by: pages/AgentPerformancePage.jsx
 */

/* ── small UI pieces ── */
export function Stat({ icon: Icon, label, value, sub, accent = "var(--text-white)", highlight }) {
  return (
    <div className={`ap-stat${highlight ? " hl" : ""}`}>
      <div className="ap-stat-label">
        {Icon && <Icon size={13} />} {label}
      </div>
      <div className="ap-stat-value" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="ap-stat-sub">{sub}</div>}
    </div>
  );
}
