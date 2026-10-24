/**
 * Every CRM screen is switched here by a page key (see constants/NavigationLinks.js); screens call
 * onNav(pageKey, payload) to move.
 *
 * Used by: App.jsx
 */

import { useState, useEffect } from "react";
import { useCrm } from "../context/CrmContext";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import AddInquiryModal from "../components/lead/AddInquiryModal";
import AdminPage from "../pages/AdminPage";
import LoginPage from "../pages/LoginPage";
import InquiriesPage from "../pages/InquiriesPage";
import FlagsPage from "../pages/FlagsPage";
import FollowupsPage from "../pages/FollowupsPage";
import ClientsPage from "../pages/ClientsPage";
import InvoiceListPage from "../pages/InvoiceListPage";
import CreateInvoice from "../pages/InvoiceFormPage";
import CreditNotesPage from "../pages/CreditNotesPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import ClientProfilePage from "../pages/ClientProfilePage";
import AgentPerformancePage from "../pages/AgentPerformancePage";
import AgentPerformanceDetailPage from "../pages/AgentPerformanceDetailPage";

export default function AppRoutes() {
  const { user, logout, error, isAdmin } = useCrm();

  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("crm-current-page") || "analytics";
    // the agent page needs a payload (which agent) that isn't saved — fall back to the list
    return saved === "agent-performance-detail" ? "agent-performance" : saved;
  });
  const [showAdd, setShowAdd] = useState(false);
  const [navPayload, setNavPayload] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist current page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("crm-current-page", page);
  }, [page]);

  /*
   * Remember which page triggered create-invoice so we can go back there
   * on close/success. "clients" is the only origin now, but keeps it flexible.
   */
  const [prevPage, setPrevPage] = useState("clients");

  const handleNavigation = (targetPage, payload = null) => {
    if (targetPage === "create-invoice") {
      // snapshot where we came from (payload.returnTo can override it,
      // for example straight back to the Client Book after converting a lead)
      setPrevPage(payload?.returnTo || page);
    }
    setPage(targetPage);
    setNavPayload(payload);
  };

  if (!user) return <LoginPage />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Sidebar */}
      <Sidebar
        active={
          page === "client-profile"
            ? "clients"
            : page === "agent-performance-detail"
              ? "agent-performance"
              : page
        }
        onNav={(page) => handleNavigation(page, null)}
        onLogout={logout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Header
          onAddInquiry={() => setShowAdd(true)}
          onMenuToggle={() => setSidebarOpen((prevSidebarOpen) => !prevSidebarOpen)}
        />
        {error && <div className="error-bar">⚠ {error}</div>}

        {/* Pages */}
        <main className="main-content">
          {page === "inquiries" && <InquiriesPage onNav={handleNavigation} />}
          {page === "flags" && <FlagsPage />}
          {page === "followups" && <FollowupsPage onNav={handleNavigation} />}
          {page === "clients" && <ClientsPage onNav={handleNavigation} />}
          {page === "analytics" && <AnalyticsPage />}
          {page === "invoices" && <InvoiceListPage onNav={handleNavigation} />}
          {page === "credit-notes" && <CreditNotesPage />}
          {page === "agents" && isAdmin && <AdminPage />}{" "}
          {/* admins only: checked here and by the backend */}
          {page === "agent-performance" && (
            <AgentPerformancePage onNav={handleNavigation} initial={navPayload} />
          )}{" "}
          {/* the page itself shows "Access restricted" to non-admins */}
          {page === "agent-performance-detail" && (
            <AgentPerformanceDetailPage
              key={navPayload?.employeeId || "none"}
              payload={navPayload}
              onNav={handleNavigation}
            />
          )}
          {page === "client-profile" && (
            <ClientProfilePage
              key={navPayload || "last"}
              clientId={navPayload}
              onBack={() => handleNavigation("clients")}
              onNav={handleNavigation}
            />
          )}
        </main>
      </div>

      {/* Add inquiry modal */}
      {showAdd && <AddInquiryModal onClose={() => setShowAdd(false)} />}

      {/* Create Invoice — overlaid on top, returns to prevPage on close/success */}
      {page === "create-invoice" && (
        <CreateInvoice
          customerData={navPayload}
          onClose={() => handleNavigation(prevPage, null)}
          onSuccess={() => handleNavigation(prevPage, null)}
        />
      )}
    </div>
  );
}
