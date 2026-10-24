/**
 * Small building blocks for the credit-note screens: status badge, type tag, modal frame, buttons,
 * sections.
 *
 * Uses the CRM's CSS tokens (dark and light theme).
 *
 * Used by: components/creditnote/ApplyCreditNoteModal.jsx,
 * components/creditnote/CreateCreditNoteModal.jsx, components/creditnote/CreditNoteDetailModal.jsx,
 * components/creditnote/RefundCreditNoteModal.jsx
 */

import { useEffect } from "react";
import { X as CloseIcon } from "lucide-react";
import { CN_STATUS, CN_TYPE } from "../../utils/CreditNoteHelpers.js";

export function CnStatusBadge({ status }) {
  const cnStatusConfig = CN_STATUS[status] || CN_STATUS.open;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        background: cnStatusConfig.bg,
        color: cnStatusConfig.color,
        border: `1px solid ${cnStatusConfig.border}`,
      }}
    >
      <span
        style={{ width: 4, height: 4, borderRadius: "50%", background: cnStatusConfig.color }}
      />
      {cnStatusConfig.label}
    </span>
  );
}

export function CnTypeTag({ type }) {
  const cnTypeConfig = CN_TYPE[type] || { label: type || "—", color: "var(--text-dim)" };
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        color: cnTypeConfig.color,
        whiteSpace: "nowrap",
      }}
    >
      {cnTypeConfig.label}
    </span>
  );
}

/* Modal shell — same overlay/box classes as the New Tax Invoice form */
export function CnModal({
  title,
  subtitle,
  icon: Icon,
  accent = "var(--orange)",
  width = 560,
  onClose,
  footer,
  children,
}) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div
        className="inv-modal"
        style={{ maxWidth: width }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {Icon && (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  flexShrink: 0,
                  background: "var(--orange-dim)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={17} color={accent} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-white)" }}>
                {title}
              </div>
              {subtitle && (
                <div className="truncate" style={{ fontSize: 10, color: accent }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              padding: 6,
              borderRadius: 8,
            }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: "14px 22px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg-card)",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export const FieldLabel = ({ children, hint }) => (
  <div
    style={{
      fontSize: 9,
      fontWeight: 700,
      color: "var(--text-dim)",
      textTransform: "uppercase",
      letterSpacing: ".1em",
      marginBottom: 5,
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    <span>{children}</span>
    {hint && (
      <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--text-ghost)" }}>
        {hint}
      </span>
    )}
  </div>
);

export function Section({ title, children, right }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-dim)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12,
            paddingBottom: 9,
            borderBottom: "1px solid var(--border-dim)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
            }}
          >
            {title}
          </span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function PrimaryBtn({ children, disabled, onClick, color = "var(--orange)", style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: color,
        border: "none",
        borderRadius: 9,
        padding: "9px 22px",
        fontSize: 12,
        fontWeight: 800,
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        display: "flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "none",
        border: "1px solid var(--border-mid)",
        borderRadius: 9,
        padding: "9px 20px",
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* Little outlined icon+label action button used in table rows */
export function RowAction({ icon: Icon, label, color, onClick, disabled, title }) {
  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        if (!disabled) onClick?.();
      }}
      disabled={disabled}
      title={title || label}
      className="cn-row-action"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "none",
        border: `1px solid ${color}40`,
        color,
        padding: "5px 9px",
        borderRadius: 7,
        fontSize: 10.5,
        fontWeight: 700,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
        transition: "background .15s",
      }}
      onMouseEnter={(event) => {
        if (!disabled) event.currentTarget.style.background = `${color}1a`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "none";
      }}
    >
      <Icon size={13} />
      <span className="cn-row-action-label">{label}</span>
    </button>
  );
}
