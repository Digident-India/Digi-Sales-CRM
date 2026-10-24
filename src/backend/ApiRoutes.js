/**
 * Every backend URL and credit-note permission slug used by the CRM. Never write a URL anywhere
 * else.
 *
 * Every backend URL lives here, grouped by domain. Never hard-code a URL anywhere else.
 * Changing a base URL = editing .env (VITE_AUTH_API / VITE_CRM_API) only.
 *
 * Used by: backend/ApiService.js
 */

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_API;
const CRM_BASE_URL = import.meta.env.VITE_CRM_API;

/**
 * Builds "?a=1&b=2" from an object, skipping empty values; "" when nothing is left.
 *
 * Builds "?a=1&b=2" and drops empty / null / undefined values.
 *
 * @param {object} [params={}]
 * @returns {string}
 */
export const toQueryString = (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const queryString = new URLSearchParams(clean).toString();
  return queryString ? `?${queryString}` : "";
};

/* Permission slugs the backend expects. The CRM reuses the invoice permissions
   every CRM employee already has. If the backend gets dedicated credit-note
   permissions (e.g. "sales.credit_note.read"), change them here only. */
export const CREDIT_NOTE_PERMISSIONS = {
  read: "sales.invoice.read",
  create: "sales.invoice.generate",
  update: "sales.invoice.update",
};

const INVOICE_READ = "sales.invoice.read";

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${AUTH_BASE_URL}/employee/login`,
    REFRESH_TOKEN: `${AUTH_BASE_URL}/employee/refresh-token`,
    FORGOT_PASSWORD: `${AUTH_BASE_URL}/employee/forget-password`,
  },

  EMPLOYEE: {
    GET_ALL: `${AUTH_BASE_URL}/employee/get`,
    GET_BY_EMAIL: (email) => `${AUTH_BASE_URL}/employee/get/${email}`,
    UPDATE_ROLE: `${AUTH_BASE_URL}/employee/role-update`,
  },

  LEADS: {
    GET_ALL: `${CRM_BASE_URL}/leads?limit=5000`,
    GET_FILTERED: (params) => `${CRM_BASE_URL}/leads?${new URLSearchParams(params)}`,
    GET_BY_ID: (id) => `${CRM_BASE_URL}/leads/${id}`,
    DASHBOARD: `${CRM_BASE_URL}/leads/dashboard`,
    UPCOMING: (days) => `${CRM_BASE_URL}/leads/upcoming?daysAhead=${days}`,
    CREATE: `${CRM_BASE_URL}/leads/`,
    UPDATE: (id) => `${CRM_BASE_URL}/leads/${id}`,
    DELETE: (id) => `${CRM_BASE_URL}/leads/${id}`,
    IMPORT_EXCEL: `${CRM_BASE_URL}/leads/import-excel`,
    DEBUG_AGENTS: `${CRM_BASE_URL}/leads/debug/agents`,
    DEBUG_UNASSIGNED_COUNT: `${CRM_BASE_URL}/leads/debug/unassigned-count`,
    MOVE_TO_FOLLOWUP: (id) => `${CRM_BASE_URL}/leads/${id}/move-to-followup`,
    CONVERT_TO_CLIENT: (id) => `${CRM_BASE_URL}/leads/${id}/convert-to-client`,
    CLIENT_OWNERS: `${CRM_BASE_URL}/leads/client-owners`,
    CREATE_CLIENT: `${CRM_BASE_URL}/leads/create-client`,
    LINK_INVOICE: (id) => `${CRM_BASE_URL}/leads/${id}/link-invoice`,
    LOG_FOLLOWUP: (id, stageType) => `${CRM_BASE_URL}/leads/${id}/followup/${stageType}`,
    LOG_REMARK_FOLLOWUP: (id) => `${CRM_BASE_URL}/leads/${id}/remark-followup`,
    LOG_ORDER: (id) => `${CRM_BASE_URL}/leads/${id}/order`,
    FLAG: (id) => `${CRM_BASE_URL}/leads/${id}/flag`,
    INCREMENT_CALL: (id) => `${CRM_BASE_URL}/leads/${id}/call`,
    UPDATE_WHATSAPP: (id) => `${CRM_BASE_URL}/leads/${id}/whatsapp`,
    DISTRIBUTE: `${CRM_BASE_URL}/leads/distribute`,
    REBALANCE_UNTOUCHED: `${CRM_BASE_URL}/leads/rebalance-untouched`,
    AGENT_DEPARTURE: (employeeId) => `${CRM_BASE_URL}/leads/agents/${employeeId}/departure`,
    AGENTS_OVERVIEW: `${CRM_BASE_URL}/leads/admin/agents-overview`,
    BY_AGENT: (employeeId, params) =>
      `${CRM_BASE_URL}/leads/admin/by-agent/${employeeId}${params ? `?${new URLSearchParams(params)}` : ""}`,
    SEARCH_CLIENTS: (searchText, limit) =>
      `${CRM_BASE_URL}/leads/clients/search?${new URLSearchParams({ q: searchText, limit })}`,
    CLIENT_PROFILE: (id) => `${CRM_BASE_URL}/leads/${id}/profile`,
    AGENT_PERFORMANCE: (range) =>
      `${CRM_BASE_URL}/leads/admin/agent-performance${toQueryString(range)}`,
    AGENT_PERFORMANCE_DETAIL: (employeeId, range) =>
      `${CRM_BASE_URL}/leads/admin/agent-performance/${employeeId}${toQueryString(range)}`,
  },

  INVOICE: {
    CREATE: `${CRM_BASE_URL}/invoice/manage/create`,
    GET_PAGE: (page, limit) =>
      `${CRM_BASE_URL}/invoice/manage/get/${INVOICE_READ}?page=${page}&limit=${limit}`,
    LIST: (params) => `${CRM_BASE_URL}/invoice/manage/get/${INVOICE_READ}${toQueryString(params)}`,
    GET_BY_ID: (id) => `${CRM_BASE_URL}/invoice/manage/get/${id}/${INVOICE_READ}`,
    CUSTOMERS: `${CRM_BASE_URL}/invoice/customers`,
    CUSTOMER_BY_ID: (id) => `${CRM_BASE_URL}/invoice/customer/${id}`,
    UPDATE: (id) => `${CRM_BASE_URL}/invoice/manage/update/${id}`,
    DELETE: (id) => `${CRM_BASE_URL}/invoice/manage/delete/${id}`,
    CREDIT_SETTLE: (invoiceId) => `${CRM_BASE_URL}/invoice/manage/credit-settle/${invoiceId}`,
    RECORD_RETURN: (invoiceId) => `${CRM_BASE_URL}/invoice/manage/return/${invoiceId}`,
    CREDIT_LOOKUP: (phone) => `${CRM_BASE_URL}/invoice/manage/credit-lookup/${phone}`,
    BY_MONTH_YEAR: (month, year, limit) =>
      `${CRM_BASE_URL}/invoice/manage/get/${INVOICE_READ}?month=${month}&year=${year}&limit=${limit}`,
    SEARCH: (search, limit) =>
      `${CRM_BASE_URL}/invoice/manage/get/${INVOICE_READ}?limit=${limit}` +
      (search ? `&search=${encodeURIComponent(search)}` : ""),
  },

  CREDIT_NOTE: {
    GET_ALL: (params) =>
      `${CRM_BASE_URL}/credit-note/manage/get/${CREDIT_NOTE_PERMISSIONS.read}${toQueryString(params)}`,
    GET_BY_ID: (id) =>
      `${CRM_BASE_URL}/credit-note/manage/get/${encodeURIComponent(id)}/${CREDIT_NOTE_PERMISSIONS.read}`,
    CREATE: `${CRM_BASE_URL}/credit-note/manage/create`,
    FROM_INVOICE: (invoiceId) => `${CRM_BASE_URL}/credit-note/manage/from-invoice/${invoiceId}`,
    APPLY_TARGETS: (creditNoteId) =>
      `${CRM_BASE_URL}/credit-note/manage/apply-targets/${creditNoteId}/${CREDIT_NOTE_PERMISSIONS.read}`,
    APPLY_TO_INVOICE: (creditNoteId) =>
      `${CRM_BASE_URL}/credit-note/manage/apply-to-invoice/${creditNoteId}`,
    APPLY: (creditNoteId) => `${CRM_BASE_URL}/credit-note/manage/apply/${creditNoteId}`,
    REFUND: (creditNoteId) => `${CRM_BASE_URL}/credit-note/manage/refund/${creditNoteId}`,
    CANCEL: (creditNoteId) => `${CRM_BASE_URL}/credit-note/manage/cancel/${creditNoteId}`,
  },
};
