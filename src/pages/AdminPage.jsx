/**
 * Screen "agents" (admins only): the full lead pipeline of every agent, grouped into batches, with
 * stat filters and search.
 *
 * Screen key: "agents" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 */

import { useState, useEffect, useMemo, Fragment } from "react";
import { useCrm } from "../context/CrmContext";
import { ROLE_LABELS, USER_ROLES } from "../constants/UserRoles";
import {
  STAGE_META,
  colorForAgent,
  addedByOf,
  NEW_WINDOW_MS,
  GROUP_PAGE_SIZE,
  BATCH_EXPAND_STEP,
  buildLeadGroups,
  groupSourceSummary,
  groupAssigneeSummary,
  formatDate,
  formatTime,
  timeAgo,
} from "../utils/AdminLeadHelpers";
import { StatCard } from "../components/dashboard/StatCard";
import { AgentChip } from "../components/agent/AgentChip";

export default function AdminPage() {
  const { employees, leads, fetchEmployees, fetchLeads, handleAgentDeparture, loading, error } =
    useCrm();

  const [actionResult, setActionResult] = useState(null);
  const [departingId, setDepartingId] = useState("");
  const [mode, setMode] = useState("auto");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"
  const [page, setPage] = useState(1);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Per-batch state so expanding a 3000-lead import never dumps 3000 rows into the DOM at once.
  const [batchSearch, setBatchSearch] = useState({}); // { [groupKey]: string }
  const [batchVisible, setBatchVisible] = useState({}); // { [groupKey]: number }

  const agents = employees.filter((employee) => employee.role === USER_ROLES.AGENT);

  useEffect(() => {
    fetchEmployees();
    fetchLeads?.();
  }, [fetchEmployees, fetchLeads]);

  const refreshLeads = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEmployees(), fetchLeads?.()]);
    } finally {
      setRefreshing(false);
    }
  };

  // Client-side workload snapshot from currently loaded leads —
  // used both for the agent departure form and the roster table.
  const workloadFor = (employeeId) => {
    const owned = leads.filter((lead) => lead.assignedEmployee === employeeId);
    return {
      total: owned.length,
      untouched: owned.filter((lead) => !lead.isTouched).length,
      touched: owned.filter((lead) => lead.isTouched).length,
    };
  };

  const runAction = async (callback) => {
    setActionResult(null);
    try {
      const result = await callback();
      setActionResult({ ok: true, data: result.data ?? result });
      refreshLeads();
    } catch (error) {
      setActionResult({ ok: false, message: error.message });
    }
  };

  const submitDeparture = (event) => {
    event.preventDefault();
    if (!departingId) return;
    const body =
      mode === "transfer" ? { mode, targetEmployeeId: targetId, reason } : { mode, reason };
    runAction(() => handleAgentDeparture(departingId, body));
  };

  // Stats derived from the full lead set — matches inquiry / followup / client / flag / upcoming counts.
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = { inquiry: 0, followup: 0, client: 0, flag: 0, upcomingCount: 0 };
    for (const lead of leads) {
      if (counts[lead.stage] !== undefined) counts[lead.stage] += 1;
      if (lead.nextFollowUpDate) {
        const nfd = new Date(lead.nextFollowUpDate);
        if (nfd >= today) counts.upcomingCount += 1;
      }
    }
    return { ...counts, total: leads.length };
  }, [leads]);

  // Who added leads, and how many — powers the responsive filter chips.
  const addedByChips = useMemo(() => {
    const map = new Map();
    for (const lead of leads) {
      const name = addedByOf(lead);
      const entry = map.get(name) || { name, total: 0, untouched: 0 };
      entry.total += 1;
      if (!lead.isTouched) entry.untouched += 1;
      map.set(name, entry);
    }
    return [...map.values()].sort((first, second) => second.total - first.total);
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    return leads
      .filter((lead) => (stageFilter === "all" ? true : lead.stage === stageFilter))
      .filter((lead) => (agentFilter === "all" ? true : addedByOf(lead) === agentFilter))
      .filter((lead) => {
        if (!searchText) return true;
        return [
          lead.doctorName,
          lead.clinicName,
          lead.contact,
          lead.city,
          lead.email,
          addedByOf(lead),
        ]
          .filter(Boolean)
          .some((fieldValue) => String(fieldValue).toLowerCase().includes(searchText));
      })
      .sort((leadA, leadB) => {
        const diff = new Date(leadB.createdAt) - new Date(leadA.createdAt);
        return sortOrder === "newest" ? diff : -diff;
      });
  }, [leads, search, stageFilter, agentFilter, sortOrder]);

  const groups = useMemo(() => buildLeadGroups(filteredLeads), [filteredLeads]);

  // Reset to page 1 whenever the underlying result set changes shape.
  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, agentFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(groups.length / GROUP_PAGE_SIZE));
  const pageGroups = groups.slice((page - 1) * GROUP_PAGE_SIZE, page * GROUP_PAGE_SIZE);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    // Start every freshly-opened batch back at the first page of its own list.
    setBatchVisible((prev) => ({ ...prev, [key]: BATCH_EXPAND_STEP }));
  };

  const setSearchFor = (key, value) => {
    setBatchSearch((prev) => ({ ...prev, [key]: value }));
    setBatchVisible((prev) => ({ ...prev, [key]: BATCH_EXPAND_STEP })); // new search = start over at 25
  };

  const showMoreFor = (key, cap) => {
    setBatchVisible((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] || BATCH_EXPAND_STEP) + BATCH_EXPAND_STEP, cap),
    }));
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ color: "#fd8d38", fontSize: 18, fontWeight: 800, margin: 0 }}>
            Agents / Admin
          </h2>
          <p style={{ color: "var(--text-ghost)", fontSize: 12, margin: "4px 0 0" }}>
            Full lead pipeline across every agent — includes leads added manually and via Excel
            import.
          </p>
        </div>
        <button
          className="btn"
          onClick={refreshLeads}
          disabled={refreshing}
          style={{ fontSize: 12 }}
        >
          {refreshing ? "Refreshing…" : "↻ Refresh leads"}
        </button>
      </div>

      {error && <div className="error-bar">⚠ {error}</div>}

      {/* ── Pipeline overview ───────────────────────────────────────── */}
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard
          label="Total Leads"
          value={stats.total}
          accent="#e2e8f0"
          active={stageFilter === "all"}
          onClick={() => setStageFilter("all")}
        />
        <StatCard
          label="Inquiry"
          value={stats.inquiry}
          accent={STAGE_META.inquiry.color}
          active={stageFilter === "inquiry"}
          onClick={() => setStageFilter("inquiry")}
        />
        <StatCard
          label="Follow-up"
          value={stats.followup}
          accent={STAGE_META.followup.color}
          active={stageFilter === "followup"}
          onClick={() => setStageFilter("followup")}
        />
        <StatCard
          label="Client"
          value={stats.client}
          accent={STAGE_META.client.color}
          active={stageFilter === "client"}
          onClick={() => setStageFilter("client")}
        />
        <StatCard
          label="Flagged"
          value={stats.flag}
          accent={STAGE_META.flag.color}
          active={stageFilter === "flag"}
          onClick={() => setStageFilter("flag")}
        />
        <StatCard label="Upcoming Follow-ups" value={stats.upcomingCount} accent="#a78bfa" />
      </section>

      {/* ── Agent roster + workload ─────────────────────────────────── */}
      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-dim)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Active Agents ({agents.length})
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              color: "var(--text-white)",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ color: "var(--text-ghost)", textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Name</th>
                <th style={{ padding: "6px 8px" }}>Role</th>
                <th style={{ padding: "6px 8px" }}>Total Leads</th>
                <th style={{ padding: "6px 8px" }}>Untouched</th>
                <th style={{ padding: "6px 8px" }}>Touched</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const workload = workloadFor(agent._id ?? agent.id);
                return (
                  <tr
                    key={agent._id ?? agent.id}
                    style={{ borderTop: "1px solid var(--border-dim)" }}
                  >
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>
                      {agent.firstName ? `${agent.firstName} ${agent.lastName}` : agent.name}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{ROLE_LABELS[agent.role]}</td>
                    <td style={{ padding: "6px 8px" }}>{workload.total}</td>
                    <td
                      style={{
                        padding: "6px 8px",
                        color: workload.untouched ? "#fbbf24" : "var(--text-ghost)",
                      }}
                    >
                      {workload.untouched}
                    </td>
                    <td style={{ padding: "6px 8px" }}>{workload.touched}</td>
                  </tr>
                );
              })}
              {!agents.length && (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: "var(--text-ghost)" }}>
                    No agents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Merged leads log ─────────────────────────────────────────── */}
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
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 14,
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
            Leads Log ({filteredLeads.length}
            {filteredLeads.length !== stats.total ? ` of ${stats.total}` : ""})
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input"
              placeholder="Search doctor, clinic, contact, city, agent…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ minWidth: 240, fontSize: 12 }}
            />
            <select
              className="input"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="all">All stages</option>
              <option value="inquiry">Inquiry</option>
              <option value="followup">Follow-up</option>
              <option value="client">Client</option>
              <option value="flag">Flagged</option>
            </select>
            <button
              className="btn"
              onClick={() =>
                setSortOrder((prevSortOrder) => (prevSortOrder === "newest" ? "oldest" : "newest"))
              }
              style={{ fontSize: 12, whiteSpace: "nowrap" }}
              title="Toggle sort order"
            >
              {sortOrder === "newest" ? "↓ Newest first" : "↑ Oldest first"}
            </button>
          </div>
        </div>

        {/* Responsive agent filter chips — wrap onto multiple lines on narrow screens,
            avatar + truncated name so long agent names never break the layout. */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <AgentChip
            label="All agents"
            count={stats.total}
            color="#e2e8f0"
            active={agentFilter === "all"}
            onClick={() => setAgentFilter("all")}
          />
          {addedByChips.map((addedByChip) => (
            <AgentChip
              key={addedByChip.name}
              label={addedByChip.name}
              count={addedByChip.total}
              subCount={0}
              color={colorForAgent(addedByChip.name)}
              active={agentFilter === addedByChip.name}
              onClick={() =>
                setAgentFilter(agentFilter === addedByChip.name ? "all" : addedByChip.name)
              }
            />
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              color: "var(--text-white)",
              borderCollapse: "collapse",
              minWidth: 560,
            }}
          >
            <thead>
              <tr style={{ color: "var(--text-ghost)", textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Added By</th>
                <th style={{ padding: "8px" }}>Date &amp; Time</th>
                <th style={{ padding: "8px" }}>Lead</th>
                <th style={{ padding: "8px" }}>Assigned Agent</th>
                <th style={{ padding: "8px" }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {pageGroups.map((pageGroup) => {
                const color = colorForAgent(pageGroup.addedBy);
                const isBatch = pageGroup.leads.length > 1;

                // Single-lead group: render exactly like a normal detail row.
                if (!isBatch) {
                  const firstLead = pageGroup.leads[0];
                  const isNew =
                    Date.now() - new Date(firstLead.createdAt).getTime() < NEW_WINDOW_MS;
                  const isExcel = firstLead.source === "excel";
                  return (
                    <tr key={pageGroup.key} style={{ borderTop: "1px solid var(--border-dim)" }}>
                      <td style={{ padding: "8px", borderLeft: `3px solid ${color}` }}>
                        <span style={{ fontWeight: 700, color }}>{pageGroup.addedBy}</span>
                      </td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "#eb9b40" }}>
                          {formatDate(firstLead.createdAt)} · {formatTime(firstLead.createdAt)}
                        </div>
                        <div style={{ color: "var(--text-ghost)", fontSize: 11 }}>
                          {timeAgo(firstLead.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: "8px", color: "var(--text-muted)" }}>
                        {firstLead.doctorName || firstLead.clinicName || "—"}
                        {isNew && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              color: "#fbbf24",
                              fontWeight: 700,
                            }}
                          >
                            ● NEW
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "8px" }}>{firstLead.assignedAgent || "Unassigned"}</td>
                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            color: isExcel ? "#60a5fa" : "#4ade80",
                            background: isExcel ? "rgba(96,165,250,0.12)" : "rgba(74,222,128,0.12)",
                            border: `1px solid ${isExcel ? "#60a5fa" : "#4ade80"}33`,
                          }}
                        >
                          {isExcel ? "Excel Import" : "Manual"}
                        </span>
                      </td>
                    </tr>
                  );
                }

                // Batch group: one summary row an admin can expand to see every lead in it.
                const expanded = expandedGroups.has(pageGroup.key);
                const anyNew = pageGroup.leads.some(
                  (lead) => Date.now() - new Date(lead.createdAt).getTime() < NEW_WINDOW_MS
                );
                const src = groupSourceSummary(pageGroup.leads);
                const assignee = groupAssigneeSummary(pageGroup.leads);
                const sameTime = pageGroup.minTime === pageGroup.maxTime;

                // Search + "show more" scoped to just this batch, so a 3000-row import
                // never renders more than BATCH_EXPAND_STEP rows into the DOM at once.
                const searchText = (batchSearch[pageGroup.key] || "").trim().toLowerCase();
                const matchedLeads = searchText
                  ? pageGroup.leads.filter((lead) =>
                      [lead.doctorName, lead.clinicName, lead.contact, lead.city]
                        .filter(Boolean)
                        .some((fieldValue) => String(fieldValue).toLowerCase().includes(searchText))
                    )
                  : pageGroup.leads;
                const visibleCount = batchVisible[pageGroup.key] || BATCH_EXPAND_STEP;
                const visibleLeads = matchedLeads.slice(0, visibleCount);
                const hasMore = visibleCount < matchedLeads.length;

                return (
                  <Fragment key={pageGroup.key}>
                    <tr
                      onClick={() => toggleGroup(pageGroup.key)}
                      style={{
                        borderTop: "1px solid var(--border-dim)",
                        cursor: "pointer",
                        background: expanded ? "rgba(255,255,255,0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "8px", borderLeft: `3px solid ${color}` }}>
                        <span style={{ color: "var(--text-ghost)", marginRight: 6 }}>
                          {expanded ? "▾" : "▸"}
                        </span>
                        <span style={{ fontWeight: 700, color }}>{pageGroup.addedBy}</span>
                      </td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "#f8a232" }}>
                          {formatDate(pageGroup.maxTime)} ·{" "}
                          {sameTime
                            ? formatTime(pageGroup.maxTime)
                            : `${formatTime(pageGroup.minTime)}–${formatTime(pageGroup.maxTime)}`}
                        </div>
                        <div style={{ color: "var(--text-ghost)", fontSize: 11 }}>
                          {timeAgo(pageGroup.maxTime)}
                        </div>
                      </td>
                      <td style={{ padding: "8px", color: "var(--text-muted)" }}>
                        <span style={{ fontWeight: 600, color: "#faa032" }}>
                          {pageGroup.leads.length.toLocaleString()} leads imported
                        </span>
                        {anyNew && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              color: "#fbbf24",
                              fontWeight: 700,
                            }}
                          >
                            ● NEW
                          </span>
                        )}
                        <span style={{ marginLeft: 8, color: "var(--text-ghost)", fontSize: 11 }}>
                          {expanded ? "click to collapse" : "click to view leads"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          color: assignee.mixed ? "var(--text-ghost)" : "var(--text-white)",
                          fontStyle: assignee.mixed ? "italic" : "normal",
                        }}
                      >
                        {assignee.label}
                      </td>
                      <td style={{ padding: "8px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            color: src.color,
                            background: `${src.color}1f`,
                            border: `1px solid ${src.color}33`,
                          }}
                        >
                          {src.label}
                        </span>
                      </td>
                    </tr>

                    {/* Search bar for this batch — only worth showing once a batch is big enough to need it. */}
                    {expanded && pageGroup.leads.length > BATCH_EXPAND_STEP && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ padding: "6px 8px", background: "rgba(255,255,255,0.015)" }}
                        >
                          <input
                            className="input"
                            placeholder={`Search within these ${pageGroup.leads.length.toLocaleString()} leads…`}
                            value={batchSearch[pageGroup.key] || ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setSearchFor(pageGroup.key, event.target.value)}
                            style={{ fontSize: 11, width: "100%", maxWidth: 360 }}
                          />
                        </td>
                      </tr>
                    )}

                    {expanded &&
                      visibleLeads.map((visibleLead) => {
                        const isNew =
                          Date.now() - new Date(visibleLead.createdAt).getTime() < NEW_WINDOW_MS;
                        const isExcel = visibleLead.source === "excel";
                        return (
                          <tr
                            key={visibleLead._id}
                            style={{ background: "rgba(255,255,255,0.015)" }}
                          >
                            <td style={{ padding: "6px 8px", borderLeft: `3px solid ${color}33` }}>
                              <span style={{ color: "var(--border-dim)", fontSize: 11 }}>↳</span>
                            </td>
                            <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                              <span style={{ color: "var(--text-ghost)", fontSize: 11 }}>
                                {formatTime(visibleLead.createdAt)}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "6px 8px",
                                color: "var(--text-muted)",
                                fontSize: 11,
                              }}
                            >
                              {visibleLead.doctorName || visibleLead.clinicName || "—"}
                              {isNew && (
                                <span
                                  style={{
                                    marginLeft: 6,
                                    fontSize: 9,
                                    color: "#fbbf24",
                                    fontWeight: 700,
                                  }}
                                >
                                  ● NEW
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "6px 8px",
                                fontSize: 11,
                                color: "var(--text-ghost)",
                              }}
                            >
                              {visibleLead.assignedAgent || "Unassigned"}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{ fontSize: 10, color: "var(--text-ghost)" }}>
                                {isExcel ? "Excel" : "Manual"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                    {expanded && matchedLeads.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "var(--text-ghost)",
                            fontSize: 11,
                          }}
                        >
                          No leads in this batch match "{batchSearch[pageGroup.key]}".
                        </td>
                      </tr>
                    )}

                    {expanded && hasMore && (
                      <tr>
                        <td colSpan={5} style={{ padding: "6px 8px", textAlign: "center" }}>
                          <button
                            className="btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              showMoreFor(pageGroup.key, matchedLeads.length);
                            }}
                            style={{ fontSize: 11, padding: "4px 12px" }}
                          >
                            Show {Math.min(BATCH_EXPAND_STEP, matchedLeads.length - visibleCount)}{" "}
                            more ({matchedLeads.length - visibleCount} remaining)
                          </button>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!pageGroups.length && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: 16, textAlign: "center", color: "var(--text-ghost)" }}
                  >
                    No leads match this search / filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────── */}
        {groups.length > GROUP_PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 14,
              fontSize: 12,
              color: "var(--text-ghost)",
            }}
          >
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn"
              disabled={page <= 1}
              onClick={() => setPage((prevPage) => prevPage - 1)}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              ← Prev
            </button>
            <button
              className="btn"
              disabled={page >= totalPages}
              onClick={() => setPage((prevPage) => prevPage + 1)}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {/* ── Agent departure ──────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-dim)",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Agent Departure
        </h3>
        <form
          onSubmit={submitDeparture}
          style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}
        >
          <select
            className="input"
            value={departingId}
            onChange={(event) => setDepartingId(event.target.value)}
            required
          >
            <option value="">Select departing agent…</option>
            {agents.map((agent) => (
              <option key={agent.employeeId} value={agent.employeeId}>
                {agent.firstName ? `${agent.firstName} ${agent.lastName}` : agent.name}
              </option>
            ))}
          </select>

          <select className="input" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="auto">Auto-distribute untouched leads</option>
            <option value="transfer">Transfer everything to specific agent</option>
          </select>

          {mode === "transfer" && (
            <select
              className="input"
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              required
            >
              <option value="">Select target agent…</option>
              {agents
                .filter((agent) => agent.employeeId !== departingId)
                .map((agent) => (
                  <option key={agent.employeeId} value={agent.employeeId}>
                    {agent.firstName ? `${agent.firstName} ${agent.lastName}` : agent.name}
                  </option>
                ))}
            </select>
          )}

          <input
            className="input"
            placeholder="Reason (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <button type="submit" disabled={loading} className="btn btn-primary">
            Confirm Departure Action
          </button>
        </form>
      </section>

      {/* Clean status confirmation banner instead of raw JSON code */}
      {actionResult && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            background: actionResult.ok ? "rgba(74, 222, 128, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${actionResult.ok ? "#4ade80" : "var(--red)"}`,
            color: actionResult.ok ? "#4ade80" : "var(--red)",
          }}
        >
          {actionResult.ok ? "✓ Action executed successfully." : `⚠ Error: ${actionResult.message}`}
        </div>
      )}
    </div>
  );
}
