/**
 * Screen "clients" (Client Book): list of clients with search, sort and filters; click one to open
 * the profile.
 *
 * A simple list of clients. Click a client to open their profile, which
 * holds everything else: details, invoices (click for full detail), a
 * Create Invoice button and the follow-ups.
 * No horizontal scrolling — rows turn into cards on small screens.
 *
 * Screen key: "clients" (see routes/AppRoutes.jsx)
 * Used by: routes/AppRoutes.jsx
 */

import { useMemo, useState } from "react";
import { Search, ChevronRight, Phone, MapPin, UserRound } from "lucide-react";
import { useCrm } from "../context/CrmContext";
import CreateClientModal from "../components/client/CreateClientModal";
import { getInitials } from "../components/lead/LeadCardParts";
import { CSS } from "../constants/ClientsPageCss";

const inr = (amount) =>
  "₹" + Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const SORTS = [
  { key: "recent", label: "Recently added" },
  { key: "name", label: "Name (A–Z)" },
  { key: "due", label: "Highest due" },
  { key: "billed", label: "Highest billing" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "due", label: "Has due" },
  { key: "noinvoice", label: "No invoice yet" },
];

export default function ClientsPage({ onNav }) {
  const { leads, invoices, search, loading, canCreateClient } = useCrm();
  const [showCreate, setShowCreate] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");

  /* Invoice totals per client (only the invoices this user can see) */
  const statsByClient = useMemo(() => {
    const statsByClientId = new Map();
    (invoices || []).forEach((invoice) => {
      if (!invoice.leadId) return;
      const leadId = String(invoice.leadId);
      const stats = statsByClientId.get(leadId) || { count: 0, billed: 0, due: 0 };
      if (invoice.status !== "cancelled" && invoice.status !== "draft") {
        stats.count += 1;
        stats.billed += Number(invoice.summary?.totalPayAmount || 0);
        if (["issued", "partially_paid"].includes(invoice.status))
          stats.due += Number(invoice.summary?.amountToPay || 0);
      }
      statsByClientId.set(leadId, stats);
    });
    return statsByClientId;
  }, [invoices]);

  const rows = useMemo(() => {
    const term = (searchText || search || "").toLowerCase().trim();
    const list = leads
      .filter((lead) => lead.stage === "client")
      .map((lead) => {
        const stats = statsByClient.get(String(lead._id));
        // fall back to the client's own invoice list if the invoice feed has none
        const count = stats?.count ?? (lead.invoices || []).length;
        const billed =
          stats?.billed ??
          (lead.invoices || []).reduce(
            (total, invoice) => total + Number(invoice.totalAmount || 0),
            0
          );
        return { ...lead, _count: count, _billed: billed, _due: stats?.due || 0 };
      })
      .filter(
        (lead) =>
          !term ||
          [
            lead.doctorName,
            lead.clinicName,
            lead.city,
            lead.state,
            lead.clientId,
            lead.contact,
            lead.assignedAgent,
            lead.contactBy,
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)
      )
      .filter((lead) =>
        filter === "all" ? true : filter === "due" ? lead._due > 0 : lead._count === 0
      );

    const by = {
      name: (clientA, clientB) =>
        String(clientA.doctorName || clientA.clinicName || "").localeCompare(
          String(clientB.doctorName || clientB.clinicName || "")
        ),
      due: (clientA, clientB) => clientB._due - clientA._due,
      billed: (clientA, clientB) => clientB._billed - clientA._billed,
      recent: (clientA, clientB) =>
        new Date(clientB.convertedAt || clientB.createdAt || 0) -
        new Date(clientA.convertedAt || clientA.createdAt || 0),
    };
    return list.sort(by[sort]);
  }, [leads, statsByClient, searchText, search, sort, filter]);

  const open = (client) => onNav("client-profile", client._id);

  return (
    <div className="fade-in">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <span className="stage-badge badge-green">Stage 3</span>
          <h2 className="page-title">Client Book</h2>
          <p className="page-sub">
            All clients · click a client to see their details, invoices and follow-ups
          </p>
        </div>
        <div className="inq-header-tools">
          {canCreateClient && (
            <button
              className="inq-chip green"
              onClick={() => setShowCreate(true)}
              title="Create a client directly, without the inquiry / follow-up stages"
            >
              + Create Client
            </button>
          )}
          <div className="page-count">
            <div className="page-count-num" style={{ color: "var(--green)" }}>
              {rows.length}
            </div>
            <div className="page-count-label">Clients</div>
          </div>
        </div>
      </div>

      {/* ── Tools ── */}
      <div className="cb-tools">
        <div className="cb-search">
          <Search size={15} className="cb-search-icon" />
          <input
            className="input"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search name, clinic, phone, city, client ID, agent…"
            style={{ paddingLeft: 38 }}
          />
        </div>
        <div className="cb-chips">
          {FILTERS.map((currentFilter) => (
            <button
              key={currentFilter.key}
              onClick={() => setFilter(currentFilter.key)}
              className={`cb-chip${filter === currentFilter.key ? " on" : ""}`}
            >
              {currentFilter.label}
            </button>
          ))}
        </div>
        <select
          className="input cb-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
        >
          {SORTS.map((sort) => (
            <option key={sort.key} value={sort.key}>
              {sort.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── List ── */}
      {loading && rows.length === 0 ? (
        <div className="cb-empty">Loading clients…</div>
      ) : rows.length === 0 ? (
        <div className="cb-empty">
          {searchText || filter !== "all"
            ? "No clients match this search / filter"
            : "No clients yet"}
        </div>
      ) : (
        <div className="cb-list">
          <div className="cb-row cb-head">
            <div>Client</div>
            <div>Contact</div>
            <div>Agent</div>
            <div className="cb-num">Invoices</div>
            <div className="cb-num">Due</div>
            <div />
          </div>
          {rows.map((row) => (
            <div
              key={row._id}
              className="cb-row cb-item"
              role="button"
              tabIndex={0}
              onClick={() => open(row)}
              onKeyDown={(event) => event.key === "Enter" && open(row)}
            >
              <div className="cb-client">
                <div className="cb-avatar">{getInitials(row.doctorName || row.clinicName)}</div>
                <div className="cb-min">
                  <div className="cb-name">
                    {row.doctorName || row.clinicName}
                    <span className={`cb-origin ${row.clientOrigin === "direct" ? "direct" : ""}`}>
                      {row.clientOrigin === "direct" ? "Direct" : "Converted"}
                    </span>
                  </div>
                  <div className="cb-sub">
                    {[row.doctorName && row.clinicName, row.clientId].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
              <div className="cb-min cb-contact">
                {row.contact && (
                  <div className="cb-line">
                    <Phone size={12} /> {row.contact}
                  </div>
                )}
                {(row.city || row.state) && (
                  <div className="cb-line cb-dim">
                    <MapPin size={12} /> {[row.city, row.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <div className="cb-min cb-agent">
                <div className="cb-line">
                  <UserRound size={12} /> {row.assignedAgent || "—"}
                </div>
                {row.nextFollowUpDate && (
                  <div className="cb-line cb-next">
                    Next follow-up {fmtDate(row.nextFollowUpDate)}
                  </div>
                )}
              </div>
              <div className="cb-num cb-inv">
                <span className="cb-label">Invoices</span>
                <b>{row._count}</b>
                {row._billed > 0 && <span className="cb-dim"> · {inr(row._billed)}</span>}
              </div>
              <div className={`cb-num cb-due ${row._due > 0 ? "red" : ""}`}>
                <span className="cb-label">Due</span>
                {row._due > 0 ? inr(row._due) : "—"}
              </div>
              <div className="cb-arrow">
                <ChevronRight size={18} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateClientModal
          onClose={() => setShowCreate(false)}
          onCreateInvoice={(client) => {
            setShowCreate(false);
            onNav("create-invoice", client);
          }}
        />
      )}
    </div>
  );
}
