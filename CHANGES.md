# Restructure to Frontend Architecture Standards v1.0.0

No business logic was changed. Files were moved/renamed and every import updated.

## Moved / renamed (old → new)

- `src/assets/home/QR.png` → `src/assets/home/BankQr.png`
- `src/assets/home/digident-png .png` → `src/assets/home/DigidentLogo.png`
- `src/assets/home/digident-png 2.png` → `src/assets/home/DigidentLogoWatermark.png`
- `src/assets/home/error.webp` → `src/assets/home/Error.webp`
- `src/api/index.js` → `src/backend/ApiService.js`
- `src/components/Agentdrilldown.jsx` → `src/components/agent/AgentDrilldown.jsx`
- `src/components/Createclientmodel.jsx` → `src/components/client/CreateClientModal.jsx`
- `src/components/credit-note/CreateCreditNoteModal.jsx` → `src/components/creditnote/CreateCreditNoteModal.jsx`
- `src/components/credit-note/CreditNoteActionModals.jsx` → `src/components/creditnote/CreditNoteActionModals.jsx`
- `src/components/credit-note/CreditNoteUI.jsx` → `src/components/creditnote/CreditNoteUi.jsx`
- `src/components/ui/AnalyticsDashboard.jsx` → `src/components/dashboard/AnalyticsDashboard.jsx`
- `src/components/FollowupModal.jsx` → `src/components/followup/FollowupModal.jsx`
- `src/components/Movetofollowupmodal.jsx` → `src/components/followup/MoveToFollowupModal.jsx`
- `src/pages/Followupmodal.jsx` → `src/components/followup/RemarkFollowupModal.jsx`
- `src/components/invoice/invoice-list-page/InvoiceCreditNotes.jsx` → `src/components/invoice/InvoiceCreditNotes.jsx`
- `src/components/invoice/invoice-list-page/InvoiceDetailModal.jsx` → `src/components/invoice/InvoiceDetailModal.jsx`
- `src/components/invoice/invoice-list-page/InvoiceTableRow.jsx` → `src/components/invoice/InvoiceTableRow.jsx`
- `src/components/invoice/invoice-list-page/invoiceUi.jsx` → `src/components/invoice/InvoiceUi.jsx`
- `src/components/invoice/invoice-list-page/Monthyearexcelexport.jsx` → `src/components/invoice/MonthYearExcelExport.jsx`
- `src/components/Header.jsx` → `src/components/layout/Header.jsx`
- `src/components/Sidebar.jsx` → `src/components/layout/Sidebar.jsx`
- `src/components/AddInquiryModal.jsx` → `src/components/lead/AddInquiryModal.jsx`
- `src/components/ConvertToClientModal.jsx` → `src/components/lead/ConvertToClientModal.jsx`
- `src/components/ExcelModal.jsx` → `src/components/lead/ExcelModal.jsx`
- `src/components/Flagmodal.jsx` → `src/components/lead/FlagModal.jsx`
- `src/components/LeadCardParts.jsx` → `src/components/lead/LeadCardParts.jsx`
- `src/components/Touchhistory.jsx` → `src/components/lead/TouchHistory.jsx`
- `src/components/Whatsappnoreplymodal.jsx` → `src/components/lead/WhatsappNoReplyModal.jsx`
- `src/components/Countup.jsx` → `src/components/ui/CountUp.jsx`
- `src/components/credit-note/CreditNotesPage.jsx` → `src/pages/CreditNotesPage.jsx`
- `src/pages/Flagspage.jsx` → `src/pages/FlagsPage.jsx`
- `src/components/invoice/InvoiceFormPage.jsx` → `src/pages/InvoiceFormPage.jsx`
- `src/components/invoice/invoice-list-page/InvoiceListPage.jsx` → `src/pages/InvoiceListPage.jsx`
- `src/utils/autoAssignTriggers.js` → `src/utils/AutoAssignTriggers.js`
- `src/components/credit-note/creditNoteHelpers.js` → `src/utils/CreditNoteHelpers.js`
- `src/components/invoice/invoice-list-page/Invoicemath.js` → `src/utils/InvoiceMath.js`
- `src/components/invoice/invoice-list-page/invoicePdf.js` → `src/utils/InvoicePdf.js`
- `src/utils/reportPdf.js` → `src/utils/ReportPdf.js`

## Deleted (unused or duplicate)

- `src/components/FollowupCell.jsx`
- `src/components/RequireAdmin.jsx`
- `src/components/invoice/invoice-list-page/CustomerGroupItem.jsx`
- `src/components/invoice/invoice-list-page/InvoiceSearch.jsx`
- `src/components/ui/AttendanceTable.jsx`
- `src/components/ui/DataList.jsx`
- `src/components/ui/DropdownGroup.jsx`
- `src/components/ui/FilterTabs.jsx`
- `src/components/ui/InputGroup.jsx`
- `src/components/ui/Loader.jsx`
- `src/components/ui/MultiSelectGroup.jsx`
- `src/components/ui/PageShell.jsx`
- `src/components/ui/Pagination.jsx`
- `src/components/ui/RadioSetting.jsx`
- `src/components/ui/RequestTable.jsx`
- `src/components/ui/ScrollToTop.jsx`
- `src/components/ui/SummaryRow.jsx`
- `src/components/ui/TextareaGroup.jsx`
- `src/components/ui/ToastHost.jsx`
- `src/constants/Autoassigntriggers.js`

## Added

- `src/backend/ApiRoutes.js`
- `src/constants/NavigationLinks.js`
- `src/routes/AppRoutes.jsx`
