/**
 * Form field label used by the invoice create and update forms.
 *
 * Used by: components/invoice/UpdateInvoiceModal.jsx, pages/InvoiceFormPage.jsx
 */

import { THEME } from "../../constants/InvoiceFormTheme.js";

export const Label = ({ children }) => (
  <div
    style={{
      fontSize: 9,
      fontWeight: 700,
      color: THEME.textGhost,
      textTransform: "uppercase",
      letterSpacing: ".1em",
      marginBottom: 5,
    }}
  >
    {children}
  </div>
);
