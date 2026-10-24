# Feature map — Digident CRM

For every screen: where it lives, what it is built from and which API calls it makes (including calls made by its components). Generated from the code; regenerate after big changes.

## AdminPage

Screen "agents" (admins only): the full lead pipeline of every agent, grouped into batches, with stat filters and search.

- **File:** `pages/AdminPage.jsx`
- **Opened by:** page key `"agents"`
- **Components:** `components/agent/AgentChip.jsx`, `components/dashboard/StatCard.jsx`
- **Helpers:** `utils/AdminLeadHelpers.js`
- **Constants:** `constants/UserRoles.js`
- **Shared state:** `context/CrmContext.jsx`

## AgentPerformancePage

Screen "agent-performance" (admins only): per-agent clients won, products sold, invoices and money collected for a period.

- **File:** `pages/AgentPerformancePage.jsx`
- **Opened by:** page key `"agent-performance"`
- **Components:** `components/agent/AgentDetail.jsx`, `components/agent/Bar.jsx`, `components/agent/Stat.jsx`, `components/ui/Alert.jsx`
- **Helpers:** `utils/AgentPerformanceHelpers.js`, `utils/ReportPdf.js`
- **Constants:** `constants/AgentPerformanceCss.js`, `constants/UserRoles.js`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `leadsApi.getAgentPerformance`, `leadsApi.getAgentPerformanceDetail`

## AnalyticsPage

Screen "analytics": lead analytics dashboard, plus the agent directory for admins.

- **File:** `pages/AnalyticsPage.jsx`
- **Opened by:** page key `"analytics"`
- **Components:** `components/agent/AgentDrilldown.jsx`, `components/agent/RemarkList.jsx`, `components/dashboard/AnalyticsDashboard.jsx`, `components/lead/TouchHistory.jsx`, `components/ui/CountUp.jsx`
- **Constants:** `constants/UserRoles.js`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `leadsApi.getAgentsOverview`, `leadsApi.getLeadsByAgent`

## ClientProfilePage

Screen "client-profile": everything about one client: details, contact buttons, billed / received / due, invoices, credit notes and follow-ups.

- **File:** `pages/ClientProfilePage.jsx`
- **Opened by:** page key `"client-profile"`
- **Components:** `components/creditnote/CreateCreditNoteModal.jsx`, `components/creditnote/CreditNoteUi.jsx`, `components/creditnote/Stat.jsx`, `components/followup/FollowupModal.jsx`, `components/invoice/InvoiceCreditNotes.jsx`, `components/invoice/InvoiceDetailModal.jsx`, `components/invoice/InvoiceUi.jsx`, `components/invoice/Label.jsx`, `components/invoice/RecordInvoiceReturnModal.jsx`, `components/invoice/SectionCard.jsx`, `components/invoice/SettleInvoiceCreditModal.jsx`, `components/invoice/UpdateInvoiceModal.jsx`, `components/lead/TouchHistory.jsx`, `components/ui/Alert.jsx`
- **Helpers:** `utils/CreditNoteHelpers.js`, `utils/CreditNoteStory.js`, `utils/InvoiceMath.js`, `utils/InvoicePdf.js`
- **Constants:** `constants/ClientProfileCss.js`, `constants/InvoiceFormTheme.js`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `creditNoteService.create`, `creditNoteService.getAll`, `creditNoteService.getById`, `invoiceService.getById`, `invoiceService.recordReturn`, `invoiceService.search`, `invoiceService.settleRefund`, `invoiceService.update`, `leadsApi.getClientProfile`

## ClientsPage

Screen "clients" (Client Book): list of clients with search, sort and filters; click one to open the profile.

- **File:** `pages/ClientsPage.jsx`
- **Opened by:** page key `"clients"`
- **Components:** `components/client/CreateClientModal.jsx`, `components/lead/ConvertToClientModal.jsx`, `components/lead/LeadCardParts.jsx`
- **Constants:** `constants/ClientsPageCss.js`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `leadsApi.getClientOwners`, `leadsApi.update`

## CreditNotesPage

Screen "credit-notes": all credit notes grouped by customer, with search, filters and actions.

- **File:** `pages/CreditNotesPage.jsx`
- **Opened by:** page key `"credit-notes"`
- **Components:** `components/creditnote/Chip.jsx`, `components/creditnote/CreateCreditNoteModal.jsx`, `components/creditnote/CreditNoteActionModals.jsx`, `components/creditnote/CreditNoteRow.jsx`, `components/creditnote/CreditNoteUi.jsx`, `components/creditnote/Stat.jsx`, `components/ui/Alert.jsx`
- **Helpers:** `utils/CreditNoteHelpers.js`, `utils/CreditNoteListHelpers.js`, `utils/CreditNoteStory.js`, `utils/InvoiceMath.js`
- **API calls:** `creditNoteService.cancel`, `creditNoteService.create`, `creditNoteService.getAll`, `creditNoteService.getById`, `invoiceService.search`

## FlagsPage

Screen "flags": leads flagged by agents for wrong or unverifiable contact details.

- **File:** `pages/FlagsPage.jsx`
- **Opened by:** page key `"flags"`
- **Components:** `components/lead/LeadCardParts.jsx`, `components/ui/Alert.jsx`
- **Shared state:** `context/CrmContext.jsx`

## FollowupsPage

Screen "followups" (stage 2): leads in the pre-sale follow-up funnel with their touch history.

- **File:** `pages/FollowupsPage.jsx`
- **Opened by:** page key `"followups"`
- **Components:** `components/followup/FollowupModal.jsx`, `components/lead/ConvertToClientModal.jsx`, `components/lead/FlagModal.jsx`, `components/lead/LeadCardParts.jsx`, `components/lead/TouchHistory.jsx`, `components/ui/Alert.jsx`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `leadsApi.update`

## InquiriesPage

Screen "inquiries" (stage 1): new leads; send WhatsApp, log calls, move to follow-up, flag, import from Excel.

- **File:** `pages/InquiriesPage.jsx`
- **Opened by:** page key `"inquiries"`
- **Components:** `components/followup/MoveToFollowupModal.jsx`, `components/followup/RemarkFollowupModal.jsx`, `components/lead/CallEntry.jsx`, `components/lead/CallSummary.jsx`, `components/lead/ExcelModal.jsx`, `components/lead/FlagModal.jsx`, `components/lead/InfoCell.jsx`, `components/lead/InquiryCard.jsx`, `components/lead/WhatsappControl.jsx`, `components/lead/WhatsappIcon.jsx`, `components/lead/WhatsappNoReplyModal.jsx`, `components/ui/Alert.jsx`, `components/ui/PaginationBar.jsx`
- **Helpers:** `utils/InquiryHelpers.js`
- **Shared state:** `context/CrmContext.jsx`

## InvoiceFormPage

Screen "create-invoice": form to create a tax invoice for a client, with available credit applied.

- **File:** `pages/InvoiceFormPage.jsx`
- **Opened by:** page key `"create-invoice"`
- **Components:** `components/invoice/ClientPicker.jsx`, `components/invoice/Label.jsx`, `components/invoice/SectionCard.jsx`
- **Helpers:** `utils/InvoiceFormHelpers.js`
- **Constants:** `constants/InvoiceFormTheme.js`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `creditNoteService.applyToInvoice`, `invoiceService.create`, `invoiceService.creditLookup`, `invoiceService.settleRefund`, `leadsApi.searchClients`

## InvoiceListPage

Screen "invoices": all invoices grouped by customer, with type tabs, agent filter, fuzzy search, PDFs, statements and Excel export.

- **File:** `pages/InvoiceListPage.jsx`
- **Opened by:** page key `"invoices"`
- **Components:** `components/creditnote/CreateCreditNoteModal.jsx`, `components/creditnote/CreditNoteUi.jsx`, `components/creditnote/Stat.jsx`, `components/invoice/ClientPicker.jsx`, `components/invoice/CustomerGroupItem.jsx`, `components/invoice/InvoiceCreditNotes.jsx`, `components/invoice/InvoiceDetailModal.jsx`, `components/invoice/InvoiceTableRow.jsx`, `components/invoice/InvoiceUi.jsx`, `components/invoice/Label.jsx`, `components/invoice/MonthYearExcelExport.jsx`, `components/invoice/RecordInvoiceReturnModal.jsx`, `components/invoice/SectionCard.jsx`, `components/invoice/SettleInvoiceCreditModal.jsx`, `components/invoice/UpdateInvoiceModal.jsx`, `components/ui/Alert.jsx`
- **Hooks:** `hooks/UseDebounced.js`
- **Helpers:** `utils/CreditNoteHelpers.js`, `utils/CreditNoteStory.js`, `utils/InvoiceExcelReport.js`, `utils/InvoiceFormHelpers.js`, `utils/InvoiceListHelpers.js`, `utils/InvoiceMath.js`, `utils/InvoicePdf.js`
- **Constants:** `constants/InvoiceFormTheme.js`
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `creditNoteService.applyToInvoice`, `creditNoteService.create`, `creditNoteService.getAll`, `creditNoteService.getById`, `invoiceService.create`, `invoiceService.creditLookup`, `invoiceService.getById`, `invoiceService.getByMonthYear`, `invoiceService.getCustomerInvoicesById`, `invoiceService.getCustomers`, `invoiceService.list`, `invoiceService.recordReturn`, `invoiceService.search`, `invoiceService.settleRefund`, `invoiceService.update`, `leadsApi.searchClients`

## LoginPage

Sign-in and forgot-password screen.

- **File:** `pages/LoginPage.jsx`
- **Opened by:** opened from another screen
- **Shared state:** `context/CrmContext.jsx`
- **API calls:** `forgotPassword`, `loginEmployee`
