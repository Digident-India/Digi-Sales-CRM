/**
 * Turns the customer data passed to the invoice form into a client and a Bill To block.
 *
 * Used by: pages/InvoiceFormPage.jsx
 */

/**
 * Turns the data passed to the invoice form into a client: a real client record, or a client built
 * from an invoice group (leadId + billTo).
 *
 * An invoice can only be made for a CLIENT (without a leadId the backend answers CLIENT_REQUIRED).
 * Where customerData comes from: • Client card / Client Profile / new client → { _id, stage:
 * "client", ... } → client fix (locked) • Invoice list customer group → { leadId, companyName, ...
 * } → client pre-selected, can be changed • "Create Invoice" button (empty) → {} → pick a client
 *
 * @param {object|null} customerData
 * @returns {object|null}
 */
export const clientFromCustomerData = (customerData) => {
  if (!customerData) return null;
  if (customerData.stage === "client" && customerData._id) return customerData;
  if (customerData.leadId) {
    return {
      _id: customerData.leadId,
      clientId: customerData.clientId || "",
      doctorName: customerData.contactPerson || "",
      clinicName: customerData.companyName || "",
      contact: customerData.contactNumber || "",
      stage: "client",
    };
  }
  return null;
};

/**
 * Fills the Bill To block from a client, keeping fields the client does not have.
 *
 * @param {object} client
 * @param {object} [prev={}] Current Bill To.
 * @returns {object}
 */
export const billToFromClient = (client, prev = {}) => ({
  ...prev,
  companyName: client.clinicName || client.doctorName || prev.companyName || "",
  contactPerson: client.doctorName || prev.contactPerson || "",
  contactNumber: client.contact || prev.contactNumber || "",
  address:
    [client.address, client.city, client.state].filter(Boolean).join(", ") || prev.address || "",
});
