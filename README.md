# Digident CRM

Sales CRM for the Digident team: inquiries come in (by hand or Excel import), agents call and follow up, converted leads become clients, and clients get invoices and credit notes. Admins assign leads and see agent performance. There is no react-router: screens are switched by a page key in src/routes/AppRoutes.jsx and pages call onNav(pageKey, payload).

## Run it

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5173
```

## Environment variables

| Variable | What it is |
|---|---|
| `VITE_AUTH_API` | Login / employee API base URL |
| `VITE_CRM_API` | CRM API base URL (leads, invoices, credit notes) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into dist/ |
| `npm run preview` | Serve the production build |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix what ESLint can fix |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting (CI) |
| `npm run test` | Run tests (Vitest) |
| `npm run test:watch` | Run tests on every change |
| `npm run metrics` | Print code size / complexity numbers |
| `npm run proxy-build` | Build check when the npm registry is blocked |
| `npm run prepare` | Installs the git pre-commit hook (runs on npm install) |

## Where is what

| I want to change ... | Look in |
|---|---|
| Add or change a screen | `src/routes/AppRoutes.jsx (page key -> screen)` |
| Add a sidebar menu item | `src/constants/NavigationLinks.js` |
| Any backend URL | `src/backend/ApiRoutes.js` |
| Any API call (and token refresh) | `src/backend/ApiService.js` |
| Shared data: leads, employees, login, counts | `src/context/CrmContext.jsx (useCrm())` |
| Roles (agent, manager, admin) | `src/constants/UserRoles.js` |
| Invoice paid / returned / due figures | `src/utils/InvoiceMath.js (getInvoiceFigures)` |
| Invoice PDF | `src/utils/InvoicePdf.js` |
| Credit-note labels, rules and PDF | `src/utils/CreditNoteHelpers.js` |
| Auto-assign / rebalance leads | `src/utils/AutoAssignTriggers.js` |
| Agent performance numbers and exports | `src/utils/AgentPerformanceHelpers.js, src/utils/ReportPdf.js` |
| Page-specific CSS | `src/constants/*Css.js and src/index.css` |

Every file in `src/` starts with a short header: what it is for, its route, which files use it and which API calls it makes. Shared functions have JSDoc. Start there before reading the code.

## Folder map

### `src/`

- `App.jsx` — Root component: renders AppRoutes. Providers are set up in main.jsx.
- `main.jsx` — App entry point: mounts React inside CrmProvider (the shared CRM data store).

### `src/routes/`

The route table (which URL or page key shows which page).

- `routes/AppRoutes.jsx` — Every CRM screen is switched here by a page key (see constants/NavigationLinks.js); screens call onNav(pageKey, payload) to move.

### `src/pages/`

One file per screen. A page loads data, holds the screen's state and puts components together.

- `pages/AdminPage.jsx` — Screen "agents" (admins only): the full lead pipeline of every agent, grouped into batches, with stat filters and search.
- `pages/AgentPerformancePage.jsx` — Screen "agent-performance" (admins only): per-agent clients won, products sold, invoices and money collected for a period.
- `pages/AnalyticsPage.jsx` — Screen "analytics": lead analytics dashboard, plus the agent directory for admins.
- `pages/ClientProfilePage.jsx` — Screen "client-profile": everything about one client: details, contact buttons, billed / received / due, invoices, credit notes and follow-ups.
- `pages/ClientsPage.jsx` — Screen "clients" (Client Book): list of clients with search, sort and filters; click one to open the profile.
- `pages/CreditNotesPage.jsx` — Screen "credit-notes": all credit notes grouped by customer, with search, filters and actions.
- `pages/FlagsPage.jsx` — Screen "flags": leads flagged by agents for wrong or unverifiable contact details.
- `pages/FollowupsPage.jsx` — Screen "followups" (stage 2): leads in the pre-sale follow-up funnel with their touch history.
- `pages/InquiriesPage.jsx` — Screen "inquiries" (stage 1): new leads; send WhatsApp, log calls, move to follow-up, flag, import from Excel.
- `pages/InvoiceFormPage.jsx` — Screen "create-invoice": form to create a tax invoice for a client, with available credit applied.
- `pages/InvoiceListPage.jsx` — Screen "invoices": all invoices grouped by customer, with type tabs, agent filter, fuzzy search, PDFs, statements and Excel export.
- `pages/LoginPage.jsx` — Sign-in and forgot-password screen.

### `src/components/`

Pieces of UI, grouped by feature (invoice/, order/, lead/ ...). ui/ holds generic building blocks.

- `components/agent/AgentChip.jsx` — Small coloured chip with an agent's initials and name (Admin page lead groups).
- `components/agent/AgentDetail.jsx` — Drill-down for one agent on the Agent Performance page: clients won, invoices, products and payments in the period, with CSV / PDF export.
- `components/agent/AgentDrilldown.jsx` — Agent directory with lead counts by stage; click an agent to see their leads, remarks and touch history (Analytics screen).
- `components/agent/Bar.jsx` — Thin horizontal progress bar used in the agent performance tables.
- `components/agent/RemarkList.jsx` — List of call remarks logged on a lead, with the next-call date.
- `components/agent/Stat.jsx` — Small label + value tile on the Agent Performance page.
- `components/client/CreateClientModal.jsx` — Modal for managers/admins to create a client directly (skipping Inquiry and Follow-up), then optionally start an invoice.
- `components/creditnote/ApplyCreditNoteModal.jsx` — Modal to use a credit note's balance to pay one of the same customer's unpaid invoices.
- `components/creditnote/Chip.jsx` — Small coloured label used in the credit-note list (type and status).
- `components/creditnote/CnSummaryStrip.jsx` — Header strip of a credit-note modal: number, customer, total and balance left.
- `components/creditnote/CreateCreditNoteModal.jsx` — Modal to raise a credit note by hand (rate difference, discount after billing, short supply, goodwill), against an invoice or for a customer.
- `components/creditnote/CreditNoteActionModals.jsx` — Re-exports the three credit-note action modals (apply, refund, detail) so existing imports keep working.
- `components/creditnote/CreditNoteDetailModal.jsx` — Shows one credit note with its history, and opens the apply / pay back / cancel actions.
- `components/creditnote/CreditNoteRow.jsx` — One credit note line in the Credit Notes list: number, invoice, amounts, where it was used, actions.
- `components/creditnote/CreditNoteUi.jsx` — Small building blocks for the credit-note screens: status badge, type tag, modal frame, buttons, sections.
- `components/creditnote/HistoryRow.jsx` — One entry in a credit note's history (applied, refunded, cancelled).
- `components/creditnote/RefundCreditNoteModal.jsx` — Modal to pay a credit note's balance back to the customer (cash, UPI, bank ...).
- `components/creditnote/Stat.jsx` — Small stat tile used in the invoice summary of the Create Credit Note modal.
- `components/dashboard/AnalyticsDashboard.jsx` — Lead analytics: counts per stage, conversion rate, follow-ups and charts (agents only see their own leads).
- `components/dashboard/StatCard.jsx` — Clickable number card used as a filter on the Admin page.
- `components/followup/FollowupModal.jsx` — Modal to log a touch (call / visit) on a follow-up lead: notes, hurdle and next follow-up date.
- `components/followup/MoveToFollowupModal.jsx` — Modal asking for a reason before an inquiry moves to the Follow-ups stage.
- `components/followup/RemarkFollowupModal.jsx` — Modal to log a call on an inquiry (picked up or not, notes, next call), up to 3 attempts per round.
- `components/invoice/ClientPicker.jsx` — Client search box at the top of the Create Invoice form (an invoice can only be made for a client).
- `components/invoice/CustomerGroupItem.jsx` — Accordion row on the Invoices screen: one customer with totals; opens to show that customer's invoices.
- `components/invoice/InvoiceCreditNotes.jsx` — Credit-note section inside the invoice detail: notes issued on this invoice, notes used to pay it, and where each one went.
- `components/invoice/InvoiceDetailModal.jsx` — Full view of one invoice: customer, items, totals, returns, refunds and credit notes, with the actions on it.
- `components/invoice/InvoiceTableRow.jsx` — One invoice line inside a CustomerGroupItem: number, date, source, status, amounts and action buttons.
- `components/invoice/InvoiceUi.jsx` — Shared invoice pieces: colour tones, ActionButton and StatusBadge.
- `components/invoice/Label.jsx` — Form field label used by the invoice create and update forms.
- `components/invoice/MonthYearExcelExport.jsx` — Button + dialog that exports the invoices of a chosen month and year to a two-sheet Excel report.
- `components/invoice/RecordInvoiceReturnModal.jsx` — Modal to record items returned on an invoice and whether the money was already refunded.
- `components/invoice/SectionCard.jsx` — Titled card that groups fields in the invoice create and update forms.
- `components/invoice/SettleInvoiceCreditModal.jsx` — Modal to settle the refund owed on an invoice as store credit or an actual payout.
- `components/invoice/UpdateInvoiceModal.jsx` — Modal form to edit an existing invoice; backend errors are shown in an alert.
- `components/layout/Header.jsx` — Top bar of the CRM with the "Log Inquiry" button and the current user.
- `components/layout/Sidebar.jsx` — Left navigation: pipeline stages and screens (admin links only for admins), with live counts.
- `components/lead/AddInquiryModal.jsx` — Modal to log a new inquiry (person, institute, contact, city, state, enquiry).
- `components/lead/CallEntry.jsx` — One logged call in an inquiry's call history.
- `components/lead/CallSummary.jsx` — Latest call of an inquiry with the round / attempt counter; expands to the earlier calls.
- `components/lead/ConvertToClientModal.jsx` — Modal to confirm the client's details and convert a follow-up lead into a client. Also exports the list of Indian states.
- `components/lead/ExcelModal.jsx` — Modal to import inquiries from an Excel / CSV file (columns detected automatically).
- `components/lead/FlagModal.jsx` — Modal to flag a lead whose contact details look wrong, with a reason.
- `components/lead/InfoCell.jsx` — Label + value cell on an inquiry card.
- `components/lead/InquiryCard.jsx` — One inquiry card: contact details, WhatsApp state, call summary and the next actions.
- `components/lead/LeadCardParts.jsx` — Small pieces shared by the card-style lead lists (Flags, Follow-ups, Clients).
- `components/lead/TouchHistory.jsx` — Month-by-month list of touches (calls / visits) logged on a lead.
- `components/lead/WhatsappControl.jsx` — The one WhatsApp control an agent needs next on an inquiry (mark sent, replied, no reply, undo).
- `components/lead/WhatsappIcon.jsx` — WhatsApp logo icon.
- `components/lead/WhatsappNoReplyModal.jsx` — Modal to record that a customer did not reply on WhatsApp and set the next contact date.
- `components/ui/Alert.jsx` — SweetAlert helpers used everywhere: toast, confirm, alert, error and dangerous-action confirm.
- `components/ui/CountUp.jsx` — Number that counts up from 0 when shown.
- `components/ui/PaginationBar.jsx` — Prev / page x of y / Next control.

### `src/backend/`

API layer: ApiRoutes.js (every URL) and ApiService.js (every HTTP call). Nothing else talks to the backend.

- `backend/ApiRoutes.js` — Every backend URL and credit-note permission slug used by the CRM. Never write a URL anywhere else.
- `backend/ApiService.js` — All HTTP calls (leads, employees, invoices, credit notes, login), with automatic token refresh on 401.

### `src/context/`

React context providers (shared state for the whole app).

- `context/CrmContext.jsx` — The CRM's shared data and actions (leads, employees, invoices, login state); every screen reads it with useCrm().

### `src/hooks/`

Reusable React hooks (useSomething).

- `hooks/UseDebounced.js` — useDebounced(value, delayMs): returns the value only after it stopped changing for delayMs (search boxes).

### `src/utils/`

Plain functions: formatting, calculations, PDFs, Excel. No JSX.

- `utils/AdminLeadHelpers.js` — Helpers for the Admin page: stage colours, agent colours and initials, grouping leads into batches, and date / time-ago text.
- `utils/AgentPerformanceHelpers.js` — Helpers for Agent Performance: money and date text, period presets, status labels, colours and the CSV export rows.
- `utils/AutoAssignTriggers.js` — Asks the backend to hand out unassigned leads to agents and rebalance untouched ones.
- `utils/CreditNoteHelpers.js` — Credit-note formatting, status / type / refund-method labels, usability rules, and the credit-note PDF.
- `utils/CreditNoteListHelpers.js` — Small helpers for the credit-note list: "#" number text, avatar colour, date-time text, chip styles.
- `utils/CreditNoteStory.js` — Writes the plain-English "what happened on this invoice" summary shown in the Create Credit Note modal.
- `utils/InquiryHelpers.js` — Helpers for the Inquiries screen: date text, call-round progress and initials.
- `utils/InvoiceExcelReport.js` — Builds the two-sheet monthly Excel report (invoice list + summary dashboard) with ExcelJS.
- `utils/InvoiceFormHelpers.js` — Turns the customer data passed to the invoice form into a client and a Bill To block.
- `utils/InvoiceListHelpers.js` — Small helpers for the Invoices screen: INR text, newest-first sort and invoice source.
- `utils/InvoiceMath.js` — getInvoiceFigures(): the one place that works out an invoice's paid, returned, refunded, credit-used and due amounts.
- `utils/InvoicePdf.js` — Builds and downloads the Digident tax-invoice PDF.
- `utils/ReportPdf.js` — Builds simple branded table reports (A4 landscape PDF) for Agent Performance.

### `src/constants/`

Fixed values: menus, themes, config, page CSS.

- `constants/AgentPerformanceCss.js` — CSS for the Agent Performance page (injected with a <style> tag).
- `constants/ClientProfileCss.js` — CSS for the Client Profile page (injected with a <style> tag).
- `constants/ClientsPageCss.js` — CSS for the Client Book page (injected with a <style> tag).
- `constants/InvoiceFormTheme.js` — Colour tokens shared by the invoice create and update forms.
- `constants/NavigationLinks.js` — Sidebar menu entries (screen key, label, icon) for agents and for admins.
- `constants/UserRoles.js` — Employee role numbers (USER_ROLES) and their display names (ROLE_LABELS).

## Documents

- `docs/CODING_STANDARDS.md` — how we write code here (read this first).
- `docs/FEATURE_MAP.md` — every screen and the components, hooks, helpers and API calls behind it.
- `docs/GLOSSARY.md` — business words (lead, client, credit note, settlement ...).
- `docs/quality/REPORT.md` — what was changed in the clean-up and how it was checked.
