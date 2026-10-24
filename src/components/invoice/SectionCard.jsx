/**
 * Titled card that groups fields in the invoice create and update forms.
 *
 * Used by: components/invoice/UpdateInvoiceModal.jsx, pages/InvoiceFormPage.jsx
 */

import { THEME } from "../../constants/InvoiceFormTheme.js";

export const SectionCard = ({ title, icon: Icon, children }) => (
  <div
    style={{
      background: THEME.bgCard,
      border: `1px solid ${THEME.borderDim}`,
      borderRadius: 12,
      padding: 18,
      marginBottom: 16,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: `1px solid ${THEME.borderDim}`,
      }}
    >
      {Icon && <Icon size={15} color={THEME.orange} />}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: THEME.textMuted,
          textTransform: "uppercase",
          letterSpacing: ".1em",
        }}
      >
        {title}
      </span>
    </div>
    {children}
  </div>
);
