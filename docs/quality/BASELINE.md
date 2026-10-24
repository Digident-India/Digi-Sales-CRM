# Phase 0: Baseline (crmsystem)

Recorded before any change. Tools: `node scripts/code-metrics.mjs` (raw data in `metrics.baseline.json`),
`npx eslint src` with the shared `eslint.config.js`, and `node scripts/proxy-build.mjs <dir>`
(hashes in `build-manifest.baseline.txt`). `vite build` could not run in the refactor workspace (no npm registry
access), so the proxy build bundles the app's own source with esbuild, the bundler Vite uses, to prove behaviour.

## Code metrics

| Metric | Value |
|---|---:|
| JS/JSX files in `src/` | 54 |
| Total lines | 13,461 |
| Files over 300 lines | 15 |
| Comment lines | 887 |
| Commented-out code lines (detected) | 4 |
| Files with more than 30% comments | 0 |
| `console.*` calls | 12 |
| Magic numbers (ESLint `no-magic-numbers`) | 625 |
| Nested ternaries | 32 |

### Files over 300 lines

```
 1100  src/pages/InvoiceListPage.jsx
  856  src/pages/InvoiceFormPage.jsx
  682  src/pages/AdminPage.jsx
  672  src/pages/AgentPerformancePage.jsx
  644  src/components/creditnote/CreateCreditNoteModal.jsx
  596  src/components/invoice/MonthYearExcelExport.jsx
  541  src/components/invoice/UpdateInvoiceModal.jsx
  529  src/pages/CreditNotesPage.jsx
  525  src/components/agent/AgentDrilldown.jsx
  484  src/pages/ClientProfilePage.jsx
  443  src/pages/InquiriesPage.jsx
  413  src/components/creditnote/CreditNoteActionModals.jsx
  408  src/backend/ApiService.js
  387  src/components/lead/ConvertToClientModal.jsx
  359  src/components/invoice/InvoiceDetailModal.jsx
```

## Lint (shared config, readability rules at "warn")

**2 errors, 1,460 warnings.** Both errors are `no-useless-escape` (`/[\s\-]/` in `CreateClientModal.jsx:80` and `ConvertToClientModal.jsx:115`).

| Rule | Count |
|---|---:|
| `id-length` | 697 |
| `no-magic-numbers` | 625 |
| `max-lines-per-function` | 64 |
| `no-nested-ternary` | 32 |
| `max-lines` | 14 |
| `no-unused-vars` | 13 |
| `no-console` | 12 |
| `no-empty` | 4 |
| `max-depth` | 1 |

`react-hooks/*` could not be measured offline; the first `npm run lint` on your machine adds those numbers.

## Build

Proxy build: 57 source inputs → `main.js` (366,082 bytes), `main.css` (23,069 bytes) and 3 assets. Output is deterministic.

## Dead files (not reachable from `src/main.jsx`)

- `src/components/invoice/InvoiceTableRow.jsx`: never imported, because `pages/InvoiceListPage.jsx` defines its own `InvoiceTableRow`.
- `src/assets/home/Element.png`, `src/assets/home/Error.webp`: referenced nowhere.

## Notes

- Commented-out code: the 4 detected lines are false positives (API-shape notes inside doc comments). This repo has essentially no dead code in comments.
- Several comments are in Hinglish (for example `utils/InvoiceMath.js`). The standard asks for English; that is a Phase 5 item.
