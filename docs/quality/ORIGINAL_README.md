# DigiDent CRM — React Frontend

Full React app for the Dental Pipeline CRM.

## Setup

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

## Configuration

Edit `.env` before running:

```env
VITE_AUTH_API=https://backend.digident.in/api/v1   # your employee backend
VITE_CRM_API=http://localhost:5000/api/v1           # the CRM backend we built
```

## Project structure

```
src/
├── api/
│   └── index.js          ← all HTTP calls (auth + CRM backend)
├── context/
│   └── CrmContext.jsx    ← global state, fetches leads, exposes actions
├── components/
│   ├── Sidebar.jsx       ← navigation + pipeline counts
│   ├── Header.jsx        ← search bar + Log Inquiry button
│   ├── FollowupCell.jsx  ← single touch slot in table
│   ├── FollowupModal.jsx ← log a follow-up touch
│   ├── AddInquiryModal.jsx
│   └── ExcelModal.jsx    ← drag-drop xlsx/csv import
├── pages/
│   ├── LoginPage.jsx     ← calls VITE_AUTH_API/employee/login
│   ├── InquiriesPage.jsx ← Stage 1
│   ├── FollowupsPage.jsx ← Stage 2 (sorted by upcoming follow-up)
│   └── ClientsPage.jsx   ← Stage 3 + order logging
├── App.jsx               ← layout + page routing
├── main.jsx
└── index.css             ← CSS variables + utility classes
```

## API endpoints used

| Action | Method | Path |
|---|---|---|
| Login | POST | `AUTH_API/employee/login` |
| Get all leads | GET | `/leads?limit=500` |
| Create inquiry | POST | `/leads` |
| Move to follow-up | PATCH | `/leads/:id/move-to-followup` |
| Log touch | POST | `/leads/:id/followup/pre-sale` |
| Convert to client | PATCH | `/leads/:id/convert-to-client` |
| Log post-sale touch | POST | `/leads/:id/followup/post-sale` |
| Log order | POST | `/leads/:id/order` |
| Import Excel | POST | `/leads/import-excel` (multipart) |

## Build for production

```bash
npm run build
npm run preview
```

## Folder structure (Frontend Architecture Standards v1.0.0)

Rules: folders are **lowercase**, `.js` / `.jsx` files are **PascalCase**.

| Looking for… | Folder |
|---|---|
| A screen (one file per route) | `src/pages/` |
| A component used by one area | `src/components/<area>/` |
| Generic UI (buttons, inputs, modals) | `src/components/ui/` |
| Sidebar / header / app shell | `src/components/layout/` |
| A backend URL | `src/backend/ApiRoutes.js` |
| An API call function | `src/backend/ApiService.js` — never call `fetch`/`axios` anywhere else |
| Menu items, roles, app-wide constants | `src/constants/` |
| Route / screen wiring | `src/routes/AppRoutes.jsx` |
| Pure helpers (PDF, Excel, maths, formatting) | `src/utils/` |
| Custom hooks (`UseXxx.js`) | `src/hooks/` |

```
src/
├── assets/
├── backend/
│   ├── ApiRoutes.js
│   └── ApiService.js
├── components/
│   ├── agent/
│   │   └── AgentDrilldown.jsx
│   ├── client/
│   │   └── CreateClientModal.jsx
│   ├── creditnote/
│   │   ├── CreateCreditNoteModal.jsx
│   │   ├── CreditNoteActionModals.jsx
│   │   └── CreditNoteUi.jsx
│   ├── dashboard/
│   │   └── AnalyticsDashboard.jsx
│   ├── followup/
│   │   ├── FollowupModal.jsx
│   │   ├── MoveToFollowupModal.jsx
│   │   └── RemarkFollowupModal.jsx
│   ├── invoice/
│   │   ├── ClientPicker.jsx
│   │   ├── InvoiceCreditNotes.jsx
│   │   ├── InvoiceDetailModal.jsx
│   │   ├── InvoiceTableRow.jsx
│   │   ├── InvoiceUi.jsx
│   │   ├── MonthYearExcelExport.jsx
│   │   ├── RecordInvoiceReturnModal.jsx
│   │   ├── SettleInvoiceCreditModal.jsx
│   │   └── UpdateInvoiceModal.jsx
│   ├── layout/
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── lead/
│   │   ├── AddInquiryModal.jsx
│   │   ├── ConvertToClientModal.jsx
│   │   ├── ExcelModal.jsx
│   │   ├── FlagModal.jsx
│   │   ├── LeadCardParts.jsx
│   │   ├── TouchHistory.jsx
│   │   └── WhatsappNoReplyModal.jsx
│   └── ui/
│       ├── Alert.jsx
│       └── CountUp.jsx
├── constants/
│   ├── NavigationLinks.js
│   └── UserRoles.js
├── context/
│   └── CrmContext.jsx
├── pages/
│   ├── AdminPage.jsx
│   ├── AgentPerformancePage.jsx
│   ├── AnalyticsPage.jsx
│   ├── ClientProfilePage.jsx
│   ├── ClientsPage.jsx
│   ├── CreditNotesPage.jsx
│   ├── FlagsPage.jsx
│   ├── FollowupsPage.jsx
│   ├── InquiriesPage.jsx
│   ├── InvoiceFormPage.jsx
│   ├── InvoiceListPage.jsx
│   └── LoginPage.jsx
├── routes/
│   └── AppRoutes.jsx
├── utils/
│   ├── AutoAssignTriggers.js
│   ├── CreditNoteHelpers.js
│   ├── InvoiceMath.js
│   ├── InvoicePdf.js
│   └── ReportPdf.js
├── App.jsx
├── index.css
└── main.jsx
```

Still to do to match the standard fully: move `context/CrmContext.jsx` to a Redux
`store/` with slices, add `validators/`, and switch `routes/AppRoutes.jsx` to React Router URLs.
