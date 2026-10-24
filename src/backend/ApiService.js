/**
 * All HTTP calls (leads, employees, invoices, credit notes, login), with automatic token refresh on
 * 401.
 *
 * Every URL comes from ./ApiRoutes.js — never write a URL in this file.
 *
 * Used by: 23 files (shared), e.g. components/agent/AgentDetail.jsx,
 * components/agent/AgentDrilldown.jsx, components/client/CreateClientModal.jsx
 */

import { API_ROUTES, CREDIT_NOTE_PERMISSIONS } from "./ApiRoutes";

export { CREDIT_NOTE_PERMISSIONS };

/* ── Token helpers ─────────────────────────────────────────────────── */
/**
 * The saved access token ("" when logged out).
 *
 * @returns {string}
 */
export const getToken = () => localStorage.getItem("crm_token") || "";
/**
 * The saved logged-in employee, or null.
 *
 * @returns {object|null}
 */
export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("crm_user"));
  } catch {
    return null;
  }
};
/**
 * Saves the access token in localStorage.
 *
 * @param {string} token
 * @returns {void}
 */
export const saveToken = (token) => localStorage.setItem("crm_token", token);
/**
 * Saves the logged-in employee in localStorage.
 *
 * @param {object} user
 * @returns {void}
 */
export const saveUser = (user) => localStorage.setItem("crm_user", JSON.stringify(user));
/**
 * Forgets the saved token and employee (logout).
 *
 * @returns {void}
 */
export const clearAuth = () => {
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_user");
};

/* ── Refresh-queue state ───────────────────────────────────────────── */
// Prevents multiple parallel refresh calls when several requests hit 401
// at the same time (e.g. CrmContext firing 3 fetches on mount).
let _isRefreshing = false;
let _pendingQueue = []; // [ { resolve, reject } ]

const _processQueue = (newToken, error) => {
  _pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(newToken)));
  _pendingQueue = [];
};

/* ── Silent token refresh ──────────────────────────────────────────── */
async function _doRefresh() {
  const res = await fetch(API_ROUTES.AUTH.REFRESH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: getToken() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Refresh failed");

  const newToken = data.token || data.data?.token || data.accessToken || data.data?.accessToken;

  if (!newToken) throw new Error("No token in refresh response");
  saveToken(newToken);
  return newToken;
}

/* ── Emit event so CrmContext can react ────────────────────────────── */
const _emitAuthExpired = () => window.dispatchEvent(new CustomEvent("auth:expired"));

/* ── Base fetch wrapper (url = a full URL from API_ROUTES) ──────────── */
async function request(method, url, body = null) {
  const buildOpts = (token) => ({
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  });

  const res = await fetch(url, buildOpts(getToken()));

  if (res.ok) return res.json();

  if (res.status !== 401) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `HTTP ${res.status}`);
  }

  if (_isRefreshing) {
    return new Promise((resolve, reject) => {
      _pendingQueue.push({
        resolve: async (newToken) => {
          try {
            const retry = await fetch(url, buildOpts(newToken));
            if (!retry.ok) {
              const errorBody = await retry.json().catch(() => ({}));
              reject(new Error(errorBody.message || `HTTP ${retry.status}`));
            } else {
              resolve(await retry.json());
            }
          } catch (error) {
            reject(error);
          }
        },
        reject,
      });
    });
  }

  _isRefreshing = true;
  try {
    const newToken = await _doRefresh();
    _isRefreshing = false;
    _processQueue(newToken, null);

    const retry = await fetch(url, buildOpts(newToken));
    if (!retry.ok) {
      const errorBody = await retry.json().catch(() => ({}));
      throw new Error(errorBody.message || `HTTP ${retry.status}`);
    }
    return retry.json();
  } catch (refreshErr) {
    _isRefreshing = false;
    _processQueue(null, refreshErr);
    clearAuth();
    _emitAuthExpired();
    throw refreshErr;
  }
}

/* ── Generic verbs ─────────────────────────────────────────────────── */
export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  put: (url, body) => request("PUT", url, body),
  patch: (url, body) => request("PATCH", url, body ?? {}),
  del: (url) => request("DELETE", url),
};

/* ── Employee login ────────────────────────────────────────────────── */
/**
 * Logs an employee in and saves the token and profile.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} The login response.
 */
export async function loginEmployee(email, password) {
  const res = await fetch(API_ROUTES.AUTH.LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Invalid credentials");

  const token = data.token || data.data?.token || data.accessToken || data.data?.accessToken;

  if (!token) throw new Error("No token received – check API response");

  const employee = data.employee || data.data?.employee || data.data || data.user || {};

  saveToken(token);
  saveUser(employee);
  return { token, employee };
}

/* ── Forgot password ───────────────────────────────────────────────── */
/**
 * Asks the backend to email a password-reset link.
 *
 * @param {string} email
 * @returns {Promise<object>}
 */
export async function forgotPassword(email) {
  const res = await fetch(API_ROUTES.AUTH.FORGOT_PASSWORD, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/* ── Excel / CSV import (multipart) ────────────────────────────────── */
/**
 * Uploads an Excel / CSV file of inquiries to import.
 *
 * @param {File} file
 * @returns {Promise<object>} Import result.
 */
export async function importExcelFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(API_ROUTES.LEADS.IMPORT_EXCEL, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Import failed");
  return data.data;
}

export const employeeApi = {
  getAll: () => api.get(API_ROUTES.EMPLOYEE.GET_ALL),
  getByEmail: (email) => api.get(API_ROUTES.EMPLOYEE.GET_BY_EMAIL(email)),
  updateRole: (email, role, permission) =>
    api.put(API_ROUTES.EMPLOYEE.UPDATE_ROLE, { email, role, permission }),
};
/* ── Lead-specific API calls ───────────────────────────────────────── */
export const leadsApi = {
  getAll: () => api.get(API_ROUTES.LEADS.GET_ALL),
  getFiltered: (params) => api.get(API_ROUTES.LEADS.GET_FILTERED(params)),
  getById: (id) => api.get(API_ROUTES.LEADS.GET_BY_ID(id)),
  dashboard: () => api.get(API_ROUTES.LEADS.DASHBOARD),
  upcoming: (days = 7) => api.get(API_ROUTES.LEADS.UPCOMING(days)),
  create: (body) => api.post(API_ROUTES.LEADS.CREATE, body),
  update: (id, body) => api.put(API_ROUTES.LEADS.UPDATE(id), body),
  remove: (id) => api.del(API_ROUTES.LEADS.DELETE(id)),
  // GET /leads/debug/agents → { count, agents: [...] } — active role-4 agents
  debugAgents: () => api.get(API_ROUTES.LEADS.DEBUG_AGENTS),
  // GET /leads/debug/unassigned-count → { unassignedCount, totalLeads }
  debugUnassignedCount: () => api.get(API_ROUTES.LEADS.DEBUG_UNASSIGNED_COUNT),
  // Pipeline actions
  moveToFollowup: (id, reason = "") => api.patch(API_ROUTES.LEADS.MOVE_TO_FOLLOWUP(id), { reason }),
  convertToClient: (id) => api.patch(API_ROUTES.LEADS.CONVERT_TO_CLIENT(id)),

  // Direct client creation (Manager / Admin / Super Admin — backend enforces)
  // GET /leads/client-owners → { data: { defaultContactBy: "Vithal Sir", employees: [{ _id, name, role, ... }] } }
  getClientOwners: () => api.get(API_ROUTES.LEADS.CLIENT_OWNERS),
  // body: { doctorName, clinicName, contact, email, address, city, state, enquiry, remarks,
  //         contactByEmployeeId? | contactBy? }  (neither → "Vithal Sir")
  createClient: (body) => api.post(API_ROUTES.LEADS.CREATE_CLIENT, body),
  // Attach an EXISTING invoice to a client (invoice _id or invoiceId UUID).
  // New invoices from a client card are linked automatically (leadId on create).
  linkInvoice: (id, invoiceId) => api.patch(API_ROUTES.LEADS.LINK_INVOICE(id), { invoiceId }),

  logFollowup: (id, stageType, body) =>
    api.post(API_ROUTES.LEADS.LOG_FOLLOWUP(id, stageType), body), // stageType: 'pre-sale' | 'post-sale'
  logRemarkFollowup: (id, body) => api.post(API_ROUTES.LEADS.LOG_REMARK_FOLLOWUP(id), body),
  logOrder: (id, body) => api.post(API_ROUTES.LEADS.LOG_ORDER(id), body),
  flagLead: (id, reason) => api.post(API_ROUTES.LEADS.FLAG(id), { reason }),
  incrementCall: (id) => api.patch(API_ROUTES.LEADS.INCREMENT_CALL(id)),
  updateWhatsapp: (id, body) => api.patch(API_ROUTES.LEADS.UPDATE_WHATSAPP(id), body), // { sent?, replied?, noReply? }

  // Assignment / distribution (Admin only — backend enforces via assertAdmin)
  distributeUnassigned: () => api.post(API_ROUTES.LEADS.DISTRIBUTE),
  // ↳ call after an Excel import, to spread unassigned leads across active agents

  rebalanceUntouched: () => api.post(API_ROUTES.LEADS.REBALANCE_UNTOUCHED),
  // ↳ call after adding a new agent, to redistribute untouched leads evenly

  handleAgentDeparture: (employeeId, body) =>
    api.post(API_ROUTES.LEADS.AGENT_DEPARTURE(employeeId), body),
  // ↳ body: { mode: "transfer" | "auto", targetEmployeeId?: string, reason?: string }
  //   "transfer" moves ALL of the departing agent's leads to targetEmployeeId
  //   "auto" redistributes only their untouched leads among remaining active agents
  getAgentsOverview: () => api.get(API_ROUTES.LEADS.AGENTS_OVERVIEW),
  // ↳ { agents: [{ _id, employeeId, firstName, lastName, email, isActive, counts:{inquiry,followup,client,flag,total} }], unassigned:{...} }

  getLeadsByAgent: (employeeId, params) => api.get(API_ROUTES.LEADS.BY_AGENT(employeeId, params)),

  /* ── Clients ── */
  // "Select Client" box (Create Invoice). Fuzzy search: works even with spelling mistakes.
  // An agent only gets their own clients. → { data: [client] }
  searchClients: (searchText = "", limit = 15) =>
    api.get(API_ROUTES.LEADS.SEARCH_CLIENTS(searchText, limit)),
  // Client Profile page → { data: { client, summary, invoices, followups, assignmentHistory, timeline } }
  getClientProfile: (id) => api.get(API_ROUTES.LEADS.CLIENT_PROFILE(id)),

  /* ── Agent Performance (Admin / Super Admin only — backend enforces) ── */
  // range: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } → { data: { range, totals, agents } }
  getAgentPerformance: (range = {}) => api.get(API_ROUTES.LEADS.AGENT_PERFORMANCE(range)),
  // → { data: { range, agent, summary, invoices, products, newClients } }
  getAgentPerformanceDetail: (employeeId, range = {}) =>
    api.get(API_ROUTES.LEADS.AGENT_PERFORMANCE_DETAIL(employeeId, range)),
};

/* ── Invoice API calls ─────────────────────────────────────────────── */
export const invoiceService = {
  /* POST /invoice/manage/create */
  create: (body) => api.post(API_ROUTES.INVOICE.CREATE, body),

  /* GET /invoice/manage/get/sales.invoice.read?page=1&limit=20
     Returns the full paginated response object:
     { data: { invoices: [], pagination: {} } } */
  getAll: (page = 1, limit = 20) => api.get(API_ROUTES.INVOICE.GET_PAGE(page, limit)),

  /* Filtered list. For an agent, the backend automatically returns only that agent's invoices.
     params: { type: "client"|"manual"|"ecommerce"|"other", createdBy, search,
               status, leadId, month, year, page, limit }
     → { data: { invoices, typeCounts: {all, client, manual, ecommerce, other}, pagination } } */
  list: (params = {}) => api.get(API_ROUTES.INVOICE.LIST(params)),

  /* GET /invoice/manage/get/:id/sales.invoice.read
     Returns single invoice object */
  getById: (id) => api.get(API_ROUTES.INVOICE.GET_BY_ID(id)),

  /* GET /invoice/customers */
  getCustomers: () => api.get(API_ROUTES.INVOICE.CUSTOMERS),

  /* GET /invoice/customer/:id */
  getCustomerInvoicesById: (id) => api.get(API_ROUTES.INVOICE.CUSTOMER_BY_ID(id)),

  /* PUT /invoice/manage/update/:id */
  update: (id, body) => api.put(API_ROUTES.INVOICE.UPDATE(id), body),

  /* DELETE /invoice/manage/delete/:id */
  remove: (id) => api.del(API_ROUTES.INVOICE.DELETE(id)),

  /* PUT /invoice/manage/credit-settle/:invoiceId
     Settles part/all of a pending refund — either a real payout
     (cash/upi/bank_transfer/card/other) or store credit (credit_note).
     body: { amount, method, reference?, appliedToOrderId?, notes? } */
  settleRefund: (invoiceId, body) => api.put(API_ROUTES.INVOICE.CREDIT_SETTLE(invoiceId), body),

  /* POST /invoice/manage/return/:invoiceId
     Records a return on a STANDALONE invoice (no source order) and
     optionally settles the refund immediately.
     body: { returnItems: [{itemId, quantity, reason?}], refundNow, refundMethod?, reference?, notes? } */
  recordReturn: (invoiceId, body) => api.post(API_ROUTES.INVOICE.RECORD_RETURN(invoiceId), body),

  /* GET /invoice/manage/credit-lookup/:phone
     Every invoice that still owes this phone number money right now. */
  creditLookup: (phone) => api.get(API_ROUTES.INVOICE.CREDIT_LOOKUP(phone)),

  /* ── Month / Year filter for Excel export ──────────────────────────
     GET /invoice/manage/get/invoice.list.get?month=5&year=2026&limit=500

     Used by MonthYearExcelExport component via the `fetchInvoices` prop.
     Unwraps the response and always returns a plain Invoice[].
     The component calls:  const invoices = await fetchInvoices(month, year)
     and expects an array — so we extract it here.
  ─────────────────────────────────────────────────────────────────── */
  getByMonthYear: async (month, year, limit = 500) => {
    const res = await api.get(API_ROUTES.INVOICE.BY_MONTH_YEAR(month, year, limit));

    // Handle all possible backend response shapes:
    //  Shape A → { data: { invoices: [...] } }   (paginated)
    //  Shape B → { data: [...] }                 (flat array in data)
    //  Shape C → { invoices: [...] }              (invoices at root)
    //  Shape D → [...]                            (bare array)
    const inner = res?.data ?? res;
    return inner?.invoices ?? (Array.isArray(inner) ? inner : []);
  },

  /* GET /invoice/manage/get/sales.invoice.read?search=…&limit=…
     Used by the credit-note form to pick the invoice it is raised against. */
  search: (search = "", limit = 100) => api.get(API_ROUTES.INVOICE.SEARCH(search, limit)),
};

/* ── Credit Note API calls ─────────────────────────────────────────────
   Backend mount: app.use("/api/v1/credit-note", creditNoteRoutes)

   Permission strings: the CRM reuses the invoice permissions every CRM
   employee already has. If the backend gets dedicated credit-note
   permissions (e.g. "sales.credit_note.read"), change them here only.
──────────────────────────────────────────────────────────────────────── */
// Permission slugs live in ApiRoutes.js (CREDIT_NOTE_PERMISSIONS).

export const creditNoteService = {
  /* GET /credit-note/manage/get/:permission
     query: { search, startDate, endDate, status, type, invoiceId, phone, page, limit }
     → { data: { creditNotes: [], summary: {}, pagination: {} } } */
  getAll: (params = {}) => api.get(API_ROUTES.CREDIT_NOTE.GET_ALL(params)),

  /* GET /credit-note/manage/get/:creditNoteId/:permission  (id or CN number) */
  getById: (id) => api.get(API_ROUTES.CREDIT_NOTE.GET_BY_ID(id)),

  /* POST /credit-note/manage/create — by hand
     body: { invoiceId? | billTo?, reason, items? | amount, gstPercent?, creditNoteDate?, notes?, refundMethod?, reference? } */
  create: (body) =>
    api.post(API_ROUTES.CREDIT_NOTE.CREATE, {
      permission: CREDIT_NOTE_PERMISSIONS.create,
      ...body,
    }),

  /* POST /credit-note/manage/from-invoice/:invoiceId — from an invoice's pending refund
     body: { amount, appliedToOrderId?, notes? } */
  createFromInvoice: (invoiceId, body) =>
    api.post(API_ROUTES.CREDIT_NOTE.FROM_INVOICE(invoiceId), {
      permission: CREDIT_NOTE_PERMISSIONS.create,
      ...body,
    }),

  /* GET /credit-note/manage/apply-targets/:creditNoteId/:permission
     → { data: { creditNote, invoices: [{ invoiceId, invoiceNumber, invoiceDate, status, total, paid, due }] } } */
  getApplyTargets: (creditNoteId) => api.get(API_ROUTES.CREDIT_NOTE.APPLY_TARGETS(creditNoteId)),

  /* PUT /credit-note/manage/apply-to-invoice/:creditNoteId — counts as payment on an existing invoice
     body: { invoiceId, amount? } */
  applyToInvoice: (creditNoteId, body) =>
    api.put(API_ROUTES.CREDIT_NOTE.APPLY_TO_INVOICE(creditNoteId), {
      permission: CREDIT_NOTE_PERMISSIONS.update,
      ...body,
    }),

  /* PUT /credit-note/manage/apply/:creditNoteId — discount on a new order/invoice
     body: { amount, appliedToId, notes? } */
  apply: (creditNoteId, body) =>
    api.put(API_ROUTES.CREDIT_NOTE.APPLY(creditNoteId), {
      permission: CREDIT_NOTE_PERMISSIONS.update,
      ...body,
    }),

  /* PUT /credit-note/manage/refund/:creditNoteId — pay it back
     body: { amount?, method, reference?, notes? } */
  refund: (creditNoteId, body) =>
    api.put(API_ROUTES.CREDIT_NOTE.REFUND(creditNoteId), {
      permission: CREDIT_NOTE_PERMISSIONS.update,
      ...body,
    }),

  /* PUT /credit-note/manage/cancel/:creditNoteId — unused manual ones only
     body: { reason? } */
  cancel: (creditNoteId, body = {}) =>
    api.put(API_ROUTES.CREDIT_NOTE.CANCEL(creditNoteId), {
      permission: CREDIT_NOTE_PERMISSIONS.update,
      ...body,
    }),
};
