/**
 * Accordion row on the Invoices screen: one customer with totals; opens to show that customer's
 * invoices.
 *
 * Used by: pages/InvoiceListPage.jsx
 */

import { Download, PlusCircle, User, ChevronDown, UserCircle2 } from "lucide-react";
import { ActionButton } from "./InvoiceUi.jsx";
import { fmtINR } from "../../utils/InvoiceListHelpers.js";
import { InvoiceTableRow } from "./InvoiceTableRow.jsx";

/* ════════════════════════════════════════════════════════════════════
   CUSTOMER GROUP — accordion
════════════════════════════════════════════════════════════════════ */
export function CustomerGroupItem({
  group,
  isOpen,
  onToggle,
  onOpenInvoice,
  onDownload,
  downloading,
  onEdit,
  onNewInvoice,
  onStatement,
  onDownloadCreditNotes,
  cnBusyId,
  onProfile,
}) {
  const count = group.invoices.length;
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${isOpen ? "rgba(249,115,22,.35)" : "rgba(249,115,22,.18)"}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: isOpen ? "0 8px 24px rgba(249,115,22,.10)" : "0 1px 3px rgba(0,0,0,.04)",
        transition: "border-color .2s, box-shadow .2s",
      }}
    >
      {/* Accordion header */}
      <div
        onClick={onToggle}
        className="acc-header"
        style={{
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            flexShrink: 0,
            background: "rgba(249,115,22,.18)",
            color: "#ea580c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <User size={24} />
        </div>

        {/* Name + contact */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-white)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {group.customerName}
            {group.clientId && (
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "var(--green)",
                  background: "var(--green-dim)",
                  border: "1px solid var(--green-ring)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {group.clientId}
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-dim)",
              marginTop: 3,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {group.contactPerson && <>{group.contactPerson} • </>}
            {count} {count === 1 ? "invoice" : "invoices"}
          </div>
        </div>

        {/* Total */}
        <div className="acc-header-total" style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 2 }}>
            Total Billing
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-white)" }}>
            {fmtINR(group.totalAmount)}
          </div>
        </div>

        {group.leadId && onProfile && (
          <ActionButton
            size="lg"
            icon={UserCircle2}
            label="Profile"
            tone="green"
            title="Client Profile"
            onClick={() => onProfile(group.leadId)}
          />
        )}
        <ActionButton
          size="lg"
          icon={PlusCircle}
          label="Create Invoice"
          tone="green"
          onClick={() => onNewInvoice(group)}
        />
        <ActionButton
          size="lg"
          icon={Download}
          label="Statement"
          tone="orange"
          title="Download Statement"
          onClick={() => onStatement(group)}
        />

        {/* Chevron */}
        <div
          style={{
            color: "#f97316",
            flexShrink: 0,
            transition: "transform .28s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <ChevronDown size={22} />
        </div>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(249,115,22,.12)",
            padding: "22px 24px",
            background: "rgba(249,115,22,.02)",
            animation: "fadeSlide .22s ease",
          }}
        >
          <div
            style={{
              overflowX: "auto",
              background: "var(--bg-surface)",
              border: "1px solid rgba(249,115,22,.18)",
              borderRadius: 14,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "rgba(249,115,22,.08)" }}>
                  {["Invoice No.", "Date", "Amount", "Status", "Actions"].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "16px 18px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#c2410c",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "22px 18px",
                        textAlign: "center",
                        fontSize: 13,
                        color: "var(--text-dim)",
                      }}
                    >
                      No invoices yet — use <b>Create Invoice</b> above to bill this customer.
                    </td>
                  </tr>
                )}
                {group.invoices.map((invoice) => (
                  <InvoiceTableRow
                    key={invoice._id}
                    inv={invoice}
                    onOpen={onOpenInvoice}
                    onDownload={onDownload}
                    onEdit={onEdit}
                    downloading={downloading}
                    onDownloadCreditNotes={onDownloadCreditNotes}
                    cnBusy={cnBusyId === (invoice.invoiceId || invoice._id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
