/**
 * Thin horizontal progress bar used in the agent performance tables.
 *
 * Used by: pages/AgentPerformancePage.jsx
 */

export function Bar({ pct, color }) {
  return (
    <div className="ap-bar">
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}
