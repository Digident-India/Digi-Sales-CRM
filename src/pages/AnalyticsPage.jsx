/**
 * Screen "analytics": lead analytics dashboard. (Per-agent details live on the Agent
 * Performance page — click an agent there.)
 *
 * Screen key: "analytics" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 */

import AnalyticsDashboard from "../components/dashboard/AnalyticsDashboard";
import { useCrm } from "../context/CrmContext";
import { USER_ROLES } from "../constants/UserRoles"; // adjust path to match your project

export default function AnalyticsPage() {
  const { user } = useCrm();
  const isAdmin = user?.role === USER_ROLES.SUPER_ADMIN || user?.role === USER_ROLES.ADMIN;

  return (
    <div
      className="fade-in responsive-page-container"
      style={{ padding: 16, maxWidth: 1280, margin: "0 auto" }}
    >
      <style>{`
        @keyframes analyticsReveal {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .analytics-stage {
          opacity: 0;
          animation: analyticsReveal .6s cubic-bezier(.16,.84,.44,1) forwards;
        }
      `}</style>

      <div className="analytics-stage" style={{ animationDelay: "0ms", marginBottom: 22 }}>
        <h2 className="page-title" style={{ margin: 0 }}>
          {isAdmin ? "Analytics" : "My Performance"}
        </h2>
        <p className="page-sub" style={{ margin: "4px 0 0" }}>
          {isAdmin
            ? "Team-wide conversions, followups and orders"
            : "Your personal conversions, followups and touch activity"}
        </p>
      </div>

      {/* Stage 1 (totals) + Stage 2 (graphs) both live inside AnalyticsDashboard,
          which has its own internal staggered reveal for KPI cards → funnel →
          charts. This wrapper just delays the whole dashboard slightly after
          the page header. */}
      <div className="analytics-stage" style={{ animationDelay: "120ms" }}>
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
