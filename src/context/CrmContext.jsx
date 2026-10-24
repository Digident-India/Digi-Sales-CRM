/**
 * The CRM's shared data and actions (leads, employees, invoices, login state); every screen reads
 * it with useCrm().
 *
 * Used by: 22 files (shared), e.g. components/client/CreateClientModal.jsx,
 * components/dashboard/AnalyticsDashboard.jsx, components/followup/FollowupModal.jsx
 * API: clearAuth, employeeApi.getAll, getToken, getUser, importExcelFile, invoiceService.getAll,
 * leadsApi.convertToClient, leadsApi.create and 15 more
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  leadsApi,
  employeeApi,
  invoiceService,
  importExcelFile,
  clearAuth,
  getToken,
  getUser,
} from "../backend/ApiService";
import { triggerDistribute, triggerRebalance } from "../utils/AutoAssignTriggers";

const CrmContext = createContext(null);
/**
 * Reads the shared CRM data and actions. Must be used inside CrmProvider.
 *
 * @returns {object} leads, employees, counts, user, isAdmin and the lead actions.
 */
export const useCrm = () => useContext(CrmContext);

const AGENT_ROLE = 4;

const AGENT_BASELINE_KEY = "crm_known_agent_ids";
const UNASSIGNED_BASELINE_KEY = "crm_known_unassigned_ids";

const loadBaseline = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
};

const saveBaseline = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // ignore local quota limitations securely
  }
};

const clearBaseline = () => {
  localStorage.removeItem(AGENT_BASELINE_KEY);
  localStorage.removeItem(UNASSIGNED_BASELINE_KEY);
};

/**
 * Holds the CRM's shared state (leads, employees, invoices, login) and the actions that change it.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children The app.
 * @returns {JSX.Element}
 */
export function CrmProvider({ children }) {
  const [leads, setLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUserState] = useState(() => getUser());
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [dashboard, setDashboard] = useState({
    inquiry: 0,
    followup: 0,
    client: 0,
    total: 0,
    upcomingCount: 0,
  });

  const isAdmin = user?.role === 0 || user?.role === 1;
  // Super Admin / Admin / Manager can create clients directly
  const canCreateClient = [0, 1, 2].includes(user?.role);

  const setUser = useCallback((emp) => setUserState(emp), []);

  const knownAgentIdsRef = useRef(loadBaseline(AGENT_BASELINE_KEY));
  const knownUnassignedIdsRef = useRef(loadBaseline(UNASSIGNED_BASELINE_KEY));

  useEffect(() => {
    const onExpired = () => {
      clearAuth();
      setUserState(null);
      setLeads([]);
      setInvoices([]);
      setEmployees([]);
      setError("Session expired. Please log in again.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError("");
    try {
      const res = await leadsApi.getAll();
      const list = res.leads || [];
      setLeads(list);

      const currentUnassignedIds = new Set(
        list.filter((lead) => !lead.assignedEmployee).map((lead) => String(lead._id))
      );

      if (knownUnassignedIdsRef.current !== null) {
        const hasNewUnassigned = [...currentUnassignedIds].some(
          (id) => !knownUnassignedIdsRef.current.has(id)
        );
        if (hasNewUnassigned && currentUnassignedIds.size > 0) {
          await triggerDistribute();
        }
      }
      knownUnassignedIdsRef.current = currentUnassignedIds;
      saveBaseline(UNASSIGNED_BASELINE_KEY, currentUnassignedIds);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await invoiceService.getAll(1, 500);
      const data = res?.data ?? res;
      setInvoices(Array.isArray(data) ? data : (data?.invoices ?? []));
    } catch (err) {
      console.error("Invoice fetch:", err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await leadsApi.dashboard();
      setDashboard(res.data ?? res);
    } catch (err) {
      console.error("Dashboard fetch:", err);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await employeeApi.getAll();
      const list = res?.data ?? res;
      const employeeList = Array.isArray(list) ? list : [];
      setEmployees(employeeList);

      const currentAgentIds = new Set(
        employeeList
          .filter((employeeEntry) => employeeEntry.role === AGENT_ROLE)
          .map((employeeEntry) => String(employeeEntry._id))
      );

      if (knownAgentIdsRef.current !== null) {
        const hasNewAgent = [...currentAgentIds].some((id) => !knownAgentIdsRef.current.has(id));
        if (hasNewAgent) {
          await triggerRebalance();
          // Immediately sync lead structures downstream after balancing workload updates
          await leadsApi.getAll().then((res) => setLeads(res.leads || []));
        }
      }
      knownAgentIdsRef.current = currentAgentIds;
      saveBaseline(AGENT_BASELINE_KEY, currentAgentIds);
    } catch (err) {
      console.error("Employee fetch:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchInvoices();
      fetchDashboard();
    }
  }, [user, fetchLeads, fetchInvoices, fetchDashboard]);

  const handleActionError = useCallback((error) => {
    if (error.isAuthError) {
      clearAuth();
      setUserState(null);
      setLeads([]);
      setInvoices([]);
      setEmployees([]);
      setError("Your session expired or is invalid. Please log in again.");
    } else {
      setError(error.message);
    }
  }, []);

  const withRefresh = useCallback(
    async (callback) => {
      setLoading(true);
      try {
        const result = await callback();
        await Promise.all([fetchLeads(), fetchDashboard()]);
        return result;
      } catch (error) {
        handleActionError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchLeads, fetchDashboard, handleActionError]
  );

  const withAdminRefresh = useCallback(
    async (callback) => {
      setLoading(true);
      try {
        const result = await callback();
        await Promise.all([fetchLeads(), fetchDashboard(), fetchEmployees()]);
        return result;
      } catch (error) {
        handleActionError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchLeads, fetchDashboard, fetchEmployees, handleActionError]
  );

  const handleAgentDeparture = (employeeId, body) =>
    withAdminRefresh(() => leadsApi.handleAgentDeparture(employeeId, body));

  const forceDistribute = () => withAdminRefresh(() => leadsApi.distributeUnassigned());
  const forceRebalance = () => withAdminRefresh(() => leadsApi.rebalanceUntouched());

  const logout = useCallback(() => {
    clearAuth();
    setLeads([]);
    setInvoices([]);
    setEmployees([]);
    setUserState(null);
    setError("");
    knownAgentIdsRef.current = null;
    knownUnassignedIdsRef.current = null;
    clearBaseline();
  }, []);

  const addInquiry = (data) => withRefresh(() => leadsApi.create(data));
  const addFollowup = (id, type, payload) =>
    withRefresh(() => leadsApi.logFollowup(id, type, payload));
  const addRemarkFollowup = (id, payload) =>
    withRefresh(() => leadsApi.logRemarkFollowup(id, payload));
  const addOrder = (id, payload) => withRefresh(() => leadsApi.logOrder(id, payload));
  const pushToFollowup = (id, reason = "") =>
    withRefresh(() => leadsApi.moveToFollowup(id, reason));
  const pushToFlag = (id, reason) => withRefresh(() => leadsApi.flagLead(id, reason));
  const updateWhatsapp = (id, patch) => withRefresh(() => leadsApi.updateWhatsapp(id, patch));
  const incrementCallCount = (id) => withRefresh(() => leadsApi.incrementCall(id));
  const deleteLead = (id) => withRefresh(() => leadsApi.remove(id));

  const handleImportExcel = async (file) => {
    const result = await importExcelFile(file);
    await triggerDistribute();
    await fetchLeads();
    return result;
  };

  const pushToClient = (id, formData) =>
    withRefresh(async () => {
      await leadsApi.update(id, formData);
      await leadsApi.convertToClient(id);
    });

  // Direct client creation — returns the created client lead
  const createClient = (formData) =>
    withRefresh(async () => {
      const res = await leadsApi.createClient(formData);
      return res?.data ?? res;
    });

  const counts = {
    inquiry: leads.filter((lead) => lead.stage === "inquiry").length,
    followup: leads.filter((lead) => lead.stage === "followup").length,
    client: leads.filter((lead) => lead.stage === "client").length,
    flag: leads.filter((lead) => lead.stage === "flag").length,
    invoice: invoices.length,
  };

  return (
    <CrmContext.Provider
      value={{
        leads,
        loading,
        error,
        user,
        isAdmin,
        canCreateClient,
        setUser,
        search,
        setSearch,
        addInquiry,
        pushToFollowup,
        pushToFlag,
        pushToClient,
        createClient,
        addFollowup,
        addRemarkFollowup,
        addOrder,
        updateWhatsapp,
        incrementCallCount,
        deleteLead,
        handleImportExcel,
        logout,
        counts,
        dashboard,
        invoices,
        employees,
        fetchEmployees,
        handleAgentDeparture,
        forceDistribute,
        forceRebalance,
        refetch: fetchLeads,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
}
