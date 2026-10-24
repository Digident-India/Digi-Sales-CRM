/**
 * Agent directory with lead counts by stage; click an agent to see their leads, remarks and touch
 * history (Analytics screen).
 *
 * Used by: pages/AnalyticsPage.jsx
 * API: leadsApi.getAgentsOverview, leadsApi.getLeadsByAgent
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { leadsApi } from "../../backend/ApiService.js";
import TouchHistory from "../lead/TouchHistory";
import CountUp from "../ui/CountUp";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { RemarkList } from "./RemarkList.jsx";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/* ────────────────────────────────────────────────────────────────────────
   AgentDrilldown — Admin/Super-Admin only.
   1) Animated grid of every role-4 agent with lead counts by stage
      (GET /leads/admin/agents-overview)
   2) Clicking an agent opens a modal "card" showing:
      - text KPIs (total leads, conversion %, touched %)
      - a stage-distribution doughnut + a touch-type bar chart
      - the full lead list (text detail), filterable by stage
      via GET /leads/admin/by-agent/:employeeId
   ──────────────────────────────────────────────────────────────────────── */

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const STAGE_META = {
  inquiry: { label: "Inquiry", color: "var(--orange)" },
  followup: { label: "Follow-up", color: "var(--yellow)" },
  client: { label: "Client", color: "var(--green)" },
  flag: { label: "Flagged", color: "var(--red, #f66)" },
};

export default function AgentDrilldown() {
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [selectedAgent, setSelectedAgent] = useState(null); // agent object from overview list
  const [agentDetail, setAgentDetail] = useState(null); // { agent, leads, total }
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const res = await leadsApi.getAgentsOverview();
      setOverview(res.data ?? res);
    } catch (error) {
      setOverviewError(error.message || "Couldn't load agents overview");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const openAgent = async (agent) => {
    setSelectedAgent(agent);
    setAgentDetail(null);
    setStageFilter("");
    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await leadsApi.getLeadsByAgent(agent._id);
      setAgentDetail(res.data ?? res);
    } catch (error) {
      setDetailError(error.message || "Couldn't load this agent's leads");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeAgent = () => {
    setSelectedAgent(null);
    setAgentDetail(null);
    setDetailError("");
  };

  const filteredLeads = (agentDetail?.leads || []).filter(
    (lead) => !stageFilter || lead.stage === stageFilter
  );

  /* ── Derived chart data for the modal (needs agentDetail.leads) ──────── */
  const touchBreakdown = useMemo(() => {
    const leadsArr = agentDetail?.leads || [];
    let remarks = 0,
      preSale = 0,
      postSale = 0;
    leadsArr.forEach((lead) => {
      remarks += (lead.remarkFollowups || []).length;
      preSale += (lead.preSaleFollowups || []).length;
      postSale += (lead.postSaleFollowups || []).length;
    });
    return { remarks, preSale, postSale };
  }, [agentDetail]);

  const touchedPct = useMemo(() => {
    const leadsArr = agentDetail?.leads || [];
    if (!leadsArr.length) return null;
    const touched = leadsArr.filter((lead) => lead.isTouched).length;
    return Math.round((touched / leadsArr.length) * 100);
  }, [agentDetail]);

  const stageCounts = selectedAgent?.counts || {
    inquiry: 0,
    followup: 0,
    client: 0,
    flag: 0,
    total: 0,
  };
  const conversionPct = stageCounts.total
    ? Math.round((stageCounts.client / stageCounts.total) * 100)
    : 0;

  const stageDoughnutData = {
    labels: ["Inquiry", "Follow-up", "Client", "Flagged"],
    datasets: [
      {
        data: [stageCounts.inquiry, stageCounts.followup, stageCounts.client, stageCounts.flag],
        backgroundColor: ["#EA580C", "#EAB308", "#22C55E", "#EF4444"],
        borderWidth: 0,
      },
    ],
  };
  const stageDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    animation: { duration: 900, easing: "easeOutQuart" },
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "var(--text-dim)", boxWidth: 10, font: { size: 10 } },
      },
    },
  };

  const touchBarData = {
    labels: ["Remarks", "Pre-Sale", "Post-Sale"],
    datasets: [
      {
        data: [touchBreakdown.remarks, touchBreakdown.preSale, touchBreakdown.postSale],
        backgroundColor: "var(--orange)",
        borderRadius: 6,
        barThickness: 22,
      },
    ],
  };
  const touchBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: "easeOutQuart" },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: "var(--text-dim)", stepSize: 1 },
        grid: { color: "rgba(255,255,255,.05)" },
      },
      y: { ticks: { color: "var(--text-dim)" }, grid: { display: false } },
    },
  };

  return (
    <div>
      <style>{`
        @keyframes agentCardIn {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .agent-card-in { opacity: 0; animation: agentCardIn .45s cubic-bezier(.16,.84,.44,1) forwards; }

        @keyframes modalPop {
          from { opacity: 0; transform: scale(.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .agent-modal-card { animation: modalPop .28s cubic-bezier(.16,.84,.44,1); }
      `}</style>

      {/* ── Agent directory ── */}
      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-dim)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              color: "var(--text-muted)",
              fontSize: 12,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Agent Directory
          </h3>
          {overview?.agents?.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {overview.agents.length} agent{overview.agents.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {overviewLoading ? (
          <div style={{ color: "var(--text-dim)", fontSize: 12, padding: 12 }}>Loading agents…</div>
        ) : overviewError ? (
          <div style={{ color: "var(--red, #f66)", fontSize: 12, padding: 12 }}>
            ⚠ {overviewError}
          </div>
        ) : !overview?.agents?.length ? (
          <div style={{ color: "var(--text-ghost)", fontSize: 12, padding: 12 }}>
            No agents found.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 12,
            }}
          >
            {overview.agents.map((agent, idx) => {
              const name = agent.firstName
                ? `${agent.firstName} ${agent.lastName || ""}`.trim()
                : agent.email;
              const isSelected = selectedAgent && selectedAgent._id === agent._id;
              const total = agent.counts?.total || 0;
              return (
                <button
                  key={agent._id}
                  className="agent-card-in"
                  onClick={() => openAgent(agent)}
                  style={{
                    animationDelay: `${idx * 45}ms`,
                    textAlign: "left",
                    cursor: "pointer",
                    background: isSelected ? "rgba(234,88,12,.1)" : "var(--bg-surface)",
                    border: isSelected
                      ? "1px solid var(--orange-ring)"
                      : "1px solid var(--border-dim)",
                    borderRadius: 12,
                    padding: "14px",
                    transition: "transform .15s ease, border-color .15s ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--orange), #c2410c)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {initials(name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--text-white)",
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "monospace" }}
                      >
                        {agent.employeeId} {agent.isActive === false ? "· inactive" : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {Object.entries(STAGE_META).map(([key, meta]) => (
                      <span
                        key={key}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: meta.color,
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-dim)",
                          borderRadius: 5,
                          padding: "2px 6px",
                        }}
                      >
                        {meta.label} {agent.counts?.[key] ?? 0}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      background: "var(--bg-card)",
                      borderRadius: 5,
                      height: 6,
                      overflow: "hidden",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 5,
                        background: "var(--orange)",
                        width: total
                          ? `${Math.min(100, (agent.counts?.client / total) * 100)}%`
                          : "0%",
                        transition: "width .8s ease",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>
                    Total: <CountUp value={total} duration={700} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {overview?.unassigned?.total > 0 && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-ghost)" }}>
            {overview.unassigned.total} lead(s) currently unassigned to any agent.
          </div>
        )}
      </section>

      {/* ── Agent detail modal ── */}
      {selectedAgent && (
        <div
          onClick={closeAgent}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="agent-modal-card"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 780,
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,.6)",
            }}
          >
            {/* Header */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1,
                background:
                  "linear-gradient(135deg,#1A1A2E 0%,#16213E 60%,rgba(234,88,12,.15) 100%)",
                borderBottom: "1px solid rgba(234,88,12,.15)",
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--orange), #c2410c)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {initials(
                    selectedAgent.firstName
                      ? `${selectedAgent.firstName} ${selectedAgent.lastName || ""}`
                      : selectedAgent.email
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                    {selectedAgent.firstName
                      ? `${selectedAgent.firstName} ${selectedAgent.lastName || ""}`.trim()
                      : selectedAgent.email}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,.6)",
                      fontFamily: "monospace",
                      marginTop: 2,
                    }}
                  >
                    {selectedAgent.employeeId} · {selectedAgent.email}
                  </div>
                </div>
              </div>
              <button
                onClick={closeAgent}
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.15)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: 22 }}>
              {/* Text KPI row */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div
                  style={{
                    flex: "1 1 140px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-ghost)", marginBottom: 4 }}>
                    Total Leads
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--orange)" }}>
                    <CountUp value={stageCounts.total} />
                  </div>
                </div>
                <div
                  style={{
                    flex: "1 1 140px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-ghost)", marginBottom: 4 }}>
                    Conversion Rate
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "var(--green)" }}>
                    <CountUp value={conversionPct} suffix="%" />
                  </div>
                </div>
                <div
                  style={{
                    flex: "1 1 140px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-ghost)", marginBottom: 4 }}>
                    Touched
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#3B82F6" }}>
                    {touchedPct === null ? "—" : <CountUp value={touchedPct} suffix="%" />}
                  </div>
                </div>
              </div>

              {/* Charts row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      marginBottom: 8,
                    }}
                  >
                    Stage Distribution
                  </div>
                  <div style={{ position: "relative", height: 190 }}>
                    <Doughnut data={stageDoughnutData} options={stageDoughnutOptions} />
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      marginBottom: 8,
                    }}
                  >
                    Touch Activity
                  </div>
                  {detailLoading ? (
                    <div
                      style={{
                        color: "var(--text-dim)",
                        fontSize: 12,
                        padding: "40px 0",
                        textAlign: "center",
                      }}
                    >
                      Loading…
                    </div>
                  ) : (
                    <div style={{ position: "relative", height: 190 }}>
                      <Bar data={touchBarData} options={touchBarOptions} />
                    </div>
                  )}
                </div>
              </div>

              {/* Stage filter tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {["", "inquiry", "followup", "client", "flag"].map((label) => (
                  <button
                    key={label || "all"}
                    onClick={() => setStageFilter(label)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background: stageFilter === label ? "var(--orange-dim)" : "var(--bg-card)",
                      border:
                        stageFilter === label
                          ? "1px solid var(--orange-ring)"
                          : "1px solid var(--border-dim)",
                      color: stageFilter === label ? "var(--orange)" : "var(--text-muted)",
                    }}
                  >
                    {label ? (STAGE_META[label]?.label ?? label) : "All"}
                  </button>
                ))}
              </div>

              {/* Lead detail list */}
              {detailLoading ? (
                <div style={{ color: "var(--text-dim)", fontSize: 12, padding: 12 }}>
                  Loading leads…
                </div>
              ) : detailError ? (
                <div style={{ color: "var(--red, #f66)", fontSize: 12, padding: 12 }}>
                  ⚠ {detailError}
                </div>
              ) : !filteredLeads.length ? (
                <div style={{ color: "var(--text-ghost)", fontSize: 12, padding: 12 }}>
                  No leads in this stage.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead._id}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-dim)",
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{ fontWeight: 700, color: "var(--text-white)", fontSize: 13 }}
                          >
                            {lead.doctorName}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {lead.clinicName}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-dim)",
                              fontFamily: "monospace",
                            }}
                          >
                            {[lead.city, lead.state].filter(Boolean).join(", ")} · {lead.contact}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: STAGE_META[lead.stage]?.color || "var(--text-muted)",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-dim)",
                            borderRadius: 6,
                            padding: "3px 9px",
                            height: "fit-content",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {STAGE_META[lead.stage]?.label || lead.stage}
                        </span>
                      </div>

                      {lead.moveReason && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--orange)",
                            fontStyle: "italic",
                            marginBottom: 8,
                          }}
                        >
                          "{lead.moveReason}"
                        </div>
                      )}

                      {lead.stage === "flag" && lead.flagReason && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--red, #f88)",
                            background: "var(--red-dim, #442222)",
                            border: "1px solid var(--red-ring, #844)",
                            borderRadius: 6,
                            padding: "3px 9px",
                            marginBottom: 8,
                            display: "inline-block",
                          }}
                        >
                          ⚑ {lead.flagReason} {lead.flaggedBy ? `— ${lead.flaggedBy}` : ""}
                        </div>
                      )}

                      {lead.clientId && (
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--green)",
                            fontFamily: "monospace",
                            marginBottom: 8,
                          }}
                        >
                          {lead.clientId}
                        </div>
                      )}

                      {lead.remarkFollowups?.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div
                            style={{
                              fontSize: 9,
                              color: "var(--text-ghost)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Remarks ({lead.remarkFollowups.length})
                          </div>
                          <RemarkList remarks={lead.remarkFollowups} />
                        </div>
                      )}

                      {lead.preSaleFollowups?.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div
                            style={{
                              fontSize: 9,
                              color: "var(--text-ghost)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Pre-Sale Touches ({lead.preSaleFollowups.length})
                          </div>
                          <TouchHistory
                            account={lead}
                            arr={lead.preSaleFollowups}
                            stageType="pre-sale"
                            onLog={() => {}}
                            readOnly
                          />
                        </div>
                      )}

                      {lead.postSaleFollowups?.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: 9,
                              color: "var(--text-ghost)",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              marginBottom: 4,
                            }}
                          >
                            Post-Sale Touches ({lead.postSaleFollowups.length})
                          </div>
                          <TouchHistory
                            account={lead}
                            arr={lead.postSaleFollowups}
                            stageType="post-sale"
                            onLog={() => {}}
                            readOnly
                          />
                        </div>
                      )}

                      {!lead.remarkFollowups?.length &&
                        !lead.preSaleFollowups?.length &&
                        !lead.postSaleFollowups?.length && (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--text-ghost)",
                              fontStyle: "italic",
                            }}
                          >
                            No follow-up activity logged yet
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
