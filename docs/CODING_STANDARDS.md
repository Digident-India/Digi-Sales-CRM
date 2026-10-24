# Digident Frontend Coding Standard

**Version 3.0, 2026-10-15.** Applies to every React + Vite repo: Digi-Ecom-V2, Digi-Front-Main-V2,
OrderManagement, crmsystem, and later Digi-Manage-V2. This file is identical in every repo: change it in all repos together.

The **folder structure** is already defined by the Frontend Architecture Standards and is correct.
This document is only about the **code inside the files**.

## The goal

> Any person who opens any file can answer four questions within 5 minutes:
> **What does this file do? What data does it need? Who uses it? Which business rule must I not break?**

Code is read many more times than it is written. When a rule here makes code longer but clearer, choose clearer.
When you are unsure, ask: *"Would a new developer understand this without asking me?"*

## Start here: how to find anything

Every repo is laid out the same way. If you know what you want to change, this table tells you where it is.

| I want to ... | Go to |
|---|---|
| Know what a file does | The header comment at the top of the file (purpose, route, used by, API calls) |
| Find which screen does X | `docs/FEATURE_MAP.md` (every screen with its components, helpers and API calls) |
| Understand a business word | `docs/GLOSSARY.md` |
| Add or change a URL / screen | `src/routes/AppRoutes.jsx` (crmsystem: page keys in the same file) |
| Add a menu item | `src/constants/NavigationLinks.js` |
| Change a backend URL | `src/backend/ApiRoutes.js` — the only place with URLs |
| Call the backend | `src/backend/ApiService.js` — the only place that uses axios / fetch |
| Shared state (login, cart, CRM data) | `src/context/` or `src/store/` |
| A calculation or business rule | `src/utils/` (pure functions, JSDoc with an example) |
| A reusable hook | `src/hooks/` (`useSomething`, file `UseSomething.js`) |
| Fixed values, themes, page CSS | `src/constants/` |
| A piece of UI | `src/components/<feature>/` (generic pieces in `components/ui/`) |
| A whole screen | `src/pages/` |

**Data always flows one way:** `pages` -> `components` -> (`hooks`, `utils`) and `pages` / `hooks` -> `backend/ApiService.js` -> `backend/ApiRoutes.js`.
A component never builds a URL, a util never renders JSX, and a page never formats money by hand.

**Reading a new screen in 5 minutes:**

1. Open `docs/FEATURE_MAP.md` and find the screen.
2. Open the page file and read its header.
3. Read the page top to bottom in this order: state -> data loading (effects) -> handlers -> JSX.
4. For any number on screen, follow it to the util that calculates it; its JSDoc has a worked example.

## How to use this document

- **Writing code:** follow the cheat sheet. Each rule links to a section with a BAD and a GOOD example from our own code.
- **Reviewing code:** use the checklist at the end (it is also the PR template).
- **The tools check most rules for you:** `npm run lint`, `npm run format`, `npm test`. A git hook runs them on every commit.

---

## Cheat sheet

| # | Rule | Section | Checked by |
|---|---|---|---|
| 1 | Names are full English words. No `s`, `r`, `it`, `inv`, `cn`. Only `i` in a classic `for` loop. | 1 | `id-length` |
| 2 | Booleans `is/has/can/should…`, handlers `handleXxx`, callback props `onXxx`, arrays plural, units in names (`dueInDays`, `timeoutMs`). | 1 | review |
| 3 | Business words come from `docs/GLOSSARY.md` (Lead, Invoice, Credit Note…). Same word in UI, code and API. | 1 | review |
| 4 | A file is max **300** lines (aim for 200), holds **one** component, and its name matches its default export. | 2 | `max-lines` |
| 5 | A function does **one** job: aim for 30 lines, max **40**. Max **3** parameters (more → one object). Max **3** levels of nesting. | 2 | `max-lines-per-function`, `max-depth` |
| 6 | No nested ternaries. | 2 | `no-nested-ternary` |
| 7 | Component order: props → hooks → derived values → handlers → effects → early returns → JSX. | 3 | review |
| 8 | More than ~6 `useState` → split the component or use `useReducer` / a custom hook. | 3 | review |
| 9 | JSX only shows data. No calculations, formatting or API shaping inside JSX. | 4 | review |
| 10 | Calculations are pure functions in `utils/` **with tests**. Reusable state lives in `hooks/`. API calls live in `backend/`. | 4 | review, tests |
| 11 | Money, dates and numbers are formatted only by the format module. No `toFixed`, `toLocaleString` or "₹" in components. | 4 | review |
| 12 | Same layout twice → one component + data. Never copy a page to make a similar page. | 5 | review |
| 13 | Colours, spacing and fonts come from the Tailwind theme, never raw hex in `className`. | 6 | review |
| 14 | No unexplained numbers or repeated strings: put them in `src/constants/` (`SCREAMING_SNAKE_CASE`). | 7 | `no-magic-numbers` |
| 15 | Comments explain **why**. Every file has a header (purpose, route, used by, API). Every export has JSDoc. Every business rule has a worked example. | 8 | review |
| 16 | No commented-out code, ever. `TODO(name, yyyy-mm-dd): what and why`. English only, no emojis. | 8 | `npm run metrics` |
| 17 | No `console.log`; use the logger. Never log tokens, passwords, OTPs or personal data. | 9 | `no-console` |
| 18 | No empty `catch`. Every screen has loading, empty and error states. Validate input before calling the API. | 9 | `no-empty`, review |
| 19 | Prettier formats all code. Imports are grouped: React, third-party, internal, relative, CSS. | 10 | Prettier, git hook |
| 20 | Conventional Commits, small PRs, PR checklist ticked. | 12 | PR template |

---

## 1. Naming

A good name removes the need for a comment. A reader should know what a variable holds without scrolling.

**1.1 Use full, descriptive English words.** One-letter names are allowed only for `i` in a classic `for` loop.

```js
// BAD  (crmsystem InvoiceDetailModal.jsx, Digi-Front Screw.jsx)
const cashRefunds = (invoice.refundHistory || []).filter((r) => !r.creditNoteId);
["No Screwdriver Needed", "PVD Coated Option"].map((s) => <span key={s}>{s}</span>);

// GOOD
const cashRefunds = (invoice.refundHistory || []).filter((refund) => !refund.creditNoteId);
PRODUCT_HIGHLIGHTS.map((highlight) => <span key={highlight}>{highlight}</span>);
```

**1.2 Name by kind of value.**

| Kind | Pattern | Example |
|---|---|---|
| Boolean | `is`, `has`, `can`, `should` + adjective | `isLoading`, `hasCredit`, `canEditInvoice` |
| Event handler inside a component | `handle` + event | `handleSubmit`, `handleRowClick` |
| Callback prop | `on` + event | `onClose`, `onSaved` |
| Array | plural noun | `invoices`, `returnedItems` |
| Map / lookup object | `xByY` | `invoicesByOrderId`, `LABEL_BY_STATUS` |
| Number with a unit | unit at the end | `dueInDays`, `timeoutMs`, `amountInRupees`, `gstPercent` |
| Function | verb first | `calculateGst`, `fetchInvoices`, `formatCurrency` |
| Component, file of a component | PascalCase noun | `InvoiceTable.jsx` exports `InvoiceTable` |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_SIZE_MB` |

```js
// BAD
const [loading, setLoading] = useState(false);
const submit = async () => { ... };
<Modal close={...} />

// GOOD
const [isLoading, setIsLoading] = useState(false);
const handleSubmit = async () => { ... };
<Modal onClose={...} />
```

**1.3 The component name matches the file name.**

```js
// BAD  (Digi-Front: Screw.jsx, Abutment.jsx and LabAnalog.jsx all export "Products")
export default function Products() { ... }

// GOOD  Screw.jsx
export default function ScrewProductPage() { ... }
```

**1.4 Use the business words from `docs/GLOSSARY.md`, exactly.** If the business says "Credit Note", the code says
`creditNote`, never `cn`, `credit` or `refundDoc`. If a word is missing, add it to the glossary in the same PR.

**1.5 Avoid vague words** like `data`, `info`, `item`, `temp`, `obj`, `handleClick2`, `newData`. Say *which* data:
`invoiceResponse`, `selectedCustomer`, `draftInvoice`.

---

## 2. Files and functions

**2.1 One component per file. Max 300 lines, aim for 200.** A long file is a sign that it does several jobs.
`CreateInvoicePage.jsx` was 1,523 lines with 15 `useState` calls. Nobody can hold that in their head. Split it by job:

```
pages/CreateInvoicePage.jsx            ← layout only: which sections, in which order
components/invoice/InvoiceItemsTable.jsx
components/invoice/InvoiceCreditPanel.jsx
hooks/UseInvoiceForm.js                ← form state and handlers
utils/InvoiceMath.js                   ← totals, GST, rounding (tested)
```

**2.2 A function does one job: aim for 30 lines, max 40.** If you need the word "and" to describe it, split it.

**2.3 More than 3 parameters → pass one object.** Call sites then explain themselves.

```js
// BAD
generateStatement(customer, invoices, fromDate, toDate, true);
// GOOD
generateStatement({ customer, invoices, fromDate, toDate, includePaidInvoices: true });
```

**2.4 Use early returns instead of deep nesting (max 3 levels).**

```js
// BAD
if (order) {
  if (order.items) {
    if (order.items.length) { return <ItemsTable items={order.items} />; }
  }
}
return null;

// GOOD
if (!order?.items?.length) return <EmptyState message="This order has no items" />;
return <ItemsTable items={order.items} />;
```

**2.5 No nested ternaries.** Use a lookup object, `if/else`, or a small named function.

```js
// BAD  (OrderManagement CustomerLedgerDrawer.jsx)
const balanceColor =
  customer.balanceStatus === "customer_owes" ? "text-coral-500"
    : customer.balanceStatus === "company_owes" ? "text-amber-500" : "text-mint-500";

// GOOD
const BALANCE_COLOR_BY_STATUS = { customer_owes: "text-coral-500", company_owes: "text-amber-500" };
const balanceColor = BALANCE_COLOR_BY_STATUS[customer.balanceStatus] ?? "text-mint-500";
```

A single, simple ternary is fine: `isOpen ? "Close" : "Open"`.

**2.6 No dead switches.** Remove `/* eslint-disable */` at the top of a file (Digi-Front `Screw.jsx` disables
`no-unused-vars` for the whole file) and `"use client"` (a Next.js directive that does nothing in Vite). Fix the
warning instead of hiding it. A one-line `eslint-disable-next-line` is allowed only with a comment saying why.

---

## 3. Components

**3.1 Always the same order inside a component**, so a reader knows where to look.

```jsx
export default function CreditNotesPage({ customerId }) {            // 1. props (destructured)
  const navigate = useNavigate();                                    // 2. hooks
  const { creditNotes, isLoading, error } = useCreditNotes(customerId);

  const openCreditNotes = creditNotes.filter(isCreditNoteOpen);      // 3. derived values

  const handleRowClick = (creditNote) => navigate(`/credit-notes/${creditNote.id}`); // 4. handlers

  useEffect(() => { document.title = "Credit notes"; }, []);         // 5. effects

  if (isLoading) return <Spinner />;                                 // 6. early returns
  if (error) return <ErrorState message="Could not load credit notes. Please try again." />;
  if (!openCreditNotes.length) return <EmptyState message="No open credit notes" />;

  return <CreditNoteTable rows={openCreditNotes} onRowClick={handleRowClick} />; // 7. JSX
}
```

**3.2 More than about 6 `useState` → split.** Use a custom hook (`useInvoiceForm`) or `useReducer` for a form whose
fields change together.

```js
// BAD: 15 separate useState calls for one invoice form (OrderManagement CreateInvoicePage.jsx)
// GOOD
const { invoice, totals, setField, addItem, removeItem, isSaving } = useInvoiceForm(initialInvoice);
```

**3.3 Derive, don't duplicate.** If a value can be calculated from props or state, calculate it, so it can never go
out of sync. Use `useMemo` only when the calculation is expensive.

```js
// BAD
const [total, setTotal] = useState(0);
useEffect(() => setTotal(sumLines(items)), [items]);
// GOOD
const total = sumLines(items);
```

**3.4 Props are destructured in the signature and named for what they mean.** Pass the data a component needs, not
the whole parent object, when only two fields are used.

**3.5 Keep JSX flat and readable.** When a JSX block needs a heading comment like `{/* HERO SECTION */}`, it is a
component: extract `<ProductHero />`. Long conditions get a name first:

```jsx
// BAD
{order.paymentStatus !== "paid" && order.orderStatus !== "cancelled" && !order.isLocked && <MarkPaidButton />}
// GOOD
const canMarkPaid = order.paymentStatus !== "paid" && order.orderStatus !== "cancelled" && !order.isLocked;
...
{canMarkPaid && <MarkPaidButton />}
```

**3.6 List keys are stable ids** (`key={invoice.invoiceId}`), never the array index when items can be added,
removed or re-ordered.

---

## 4. Where logic lives

Each kind of code has one home. A reader then always knows where to find it.

| Code | Home | Rule |
|---|---|---|
| Calculations (totals, GST, refunds, dates) | `utils/` | pure functions: same input → same output, no side effects, **with tests** |
| Reusable stateful logic | `hooks/` (`UseXxx.js`, exported as `useXxx`) | returns data + handlers, no JSX |
| API calls | `backend/ApiService.js`, URLs in `backend/ApiRoutes.js` | components never call `axios` directly |
| Fixed values, labels, statuses | `constants/` | named objects |
| Input checks | `validators/` | return a list of messages per field |
| Display | `components/`, `pages/` | show data, call handlers |

**4.1 No business calculation inside a component or JSX.**

```jsx
// BAD  (OrderManagement CreateInvoicePage.jsx: the invoice total is computed in the component)
const itemsNetTotal = Math.max(
  Math.round(formData.items.reduce((sum, it) =>
    sum + (Number(it.qty) || 0) * (Number(it.price) || 0) - (Number(it.discountValue) || 0), 0) * 100) / 100,
  0);

// GOOD: utils/InvoiceMath.js (tested), the component just calls it
const itemsNetTotal = calculateItemsNetTotal(formData.items);
```

crmsystem's `utils/InvoiceMath.js` (`getInvoiceFigures`) shows the right idea: one place, reusable, testable.

**4.2 One format module.** Currency, dates, numbers and phone numbers are formatted by one module (`utils/Format.js`,
same function names in every repo). Nobody calls `toFixed` or `toLocaleString` in a component, and nobody types "₹".

```jsx
// BAD  (repeated in 10+ files per repo)
<span>₹{netAmount.toLocaleString("en-IN")}</span>
<td>{(price * qty).toFixed(2)}</td>

// GOOD
<span>{formatCurrency(netAmount)}</span>
<td>{formatAmount(lineTotal)}</td>
```

**4.3 The money rule** (one rule for everyone, written down so nobody guesses):
- Amounts are **rupees** as JavaScript numbers. The API sends and expects rupees.
- Round to **2 decimals, half up**, with one helper `roundToPaise(amount)`:
  `Math.round((amount + Number.EPSILON) * 100) / 100` (the formula the code already uses).
- Round **each line**, then add the rounded lines. Never round only the final sum.
- Show amounts only through `formatCurrency` / `formatAmount`.
- Worked example: 3 × ₹33.335 = 100.005 → ₹100.01. GST 18% of ₹100.01 = 18.0018 → ₹18.00. Line total ₹118.01.

> Whether screens show whole rupees or paise is a business decision, confirmed with the product owner before the
> format module is rolled out.

**4.4 Components never shape API data.** Mapping a raw API response into what the screen needs happens in
`backend/ApiService.js` or a `utils/` mapper, so all screens get the same shape.

---

## 5. Don't repeat yourself: one component plus data

**5.1 When two screens share a layout, build one component and feed it data.** Copy-paste means every fix must be
made five times, and one copy is always forgotten.

```jsx
// BAD  (Digi-Front: Screw.jsx, Abutment.jsx, LabAnalog.jsx, ScanBody.jsx, ScanBridge.jsx are 360–450 lines each,
//       with the same animation variants, hero, spec pills and CTA copied into every file)

// GOOD
// constants/Products.js
export const PRODUCTS = {
  screw: { title: "Screw", heroImage: screwMain, highlights: ["No Screwdriver Needed", "PVD Coated Option"], ... },
  abutment: { ... },
};
// pages/Screw.jsx
export default function ScrewProductPage() {
  return <ProductDetailTemplate product={PRODUCTS.screw} />;
}
```

**5.2 Shared constants are defined once.** Animation variants (`fadeInUp`, `staggerContainer`) used by several pages
live in one file in `constants/`, not copied into each page.

---

## 6. Styling

**6.1 Brand colours, fonts and spacing come from the Tailwind theme.** Never type a hex code in a `className`.

```jsx
// BAD  (Digi-Front: "#E68736" appears 446 times, "#0b2230" 90 times)
<span className="text-[#E68736] bg-[#E68736]/10 border border-[#E68736]/20">

// GOOD: tailwind.config.js → theme.extend.colors.brand = { orange: "#E68736", navy: "#0b2230" }
<span className="text-brand-orange bg-brand-orange/10 border border-brand-orange/20">
```

**6.2 Repeated class lists become a component or a constant.** If the same 6+ classes appear on three buttons, make
`<PrimaryButton>`. Conditional classes use a lookup object (rule 2.5), not string concatenation with ternaries.

**6.3 Inline `style={{...}}` only for values computed at runtime** (for example a progress-bar width). Static styling
uses Tailwind classes (or the repo's CSS variables, as in crmsystem).

---

## 7. Constants and magic values

**7.1 No unexplained numbers or repeated strings.** Statuses, limits, default days and labels live in
`src/constants/` as named objects in `SCREAMING_SNAKE_CASE`.

```js
// BAD  (OrderManagement CreateInvoicePage.jsx, Digi-Ecom CheckoutPage.jsx, crmsystem ApiRoutes.js)
new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
GET_ALL: `${CRM_BASE_URL}/leads?limit=5000`,
getInvoicesByMonthYear: async (month, year, limit = 500) => { ... }

// GOOD  constants/Invoice.js
export const INVOICE_DEFAULTS = { DUE_IN_DAYS: 10, MONTHLY_EXPORT_LIMIT: 500 };
// usage
const dueDate = addDays(today, INVOICE_DEFAULTS.DUE_IN_DAYS);
```

**7.2 Status values are constants, with their labels next to them.** crmsystem's `constants/UserRoles.js`
(`USER_ROLES`, `ROLE_LABELS`) is the pattern to copy.

```js
export const ORDER_STATUS = { PLACED: "placed", SHIPPED: "shipped", CANCELLED: "cancelled" };
export const ORDER_STATUS_LABEL = { placed: "Placed", shipped: "Shipped", cancelled: "Cancelled" };
// usage
if (order.orderStatus === ORDER_STATUS.CANCELLED) ...
```

Allowed without a name: `0`, `1`, `-1`, `2`, `100` (percent), and array indexes.

---

## 8. Comments and documentation

**8.1 Comments explain WHY, never WHAT.** The code already says what it does.

```js
// BAD
// set loading to true
setIsLoading(true);

// GOOD  (OrderManagement utils/Format.js)
// Backend dates are UTC. Without a fixed timeZone the browser's own zone is used,
// so we pin India time to show the same date on every device.
const IST = "Asia/Kolkata";
```

**8.2 Every file starts with a header block:** what it is for (one or two sentences), then anything surprising,
then the facts a reader needs to find their way: route or screen key, who uses it, which API calls it makes.
Keep "Used by" and "API" up to date when you change imports.

```js
// BAD  (path-only header; says nothing the file name does not already say)
// src/pages/InvoiceListPage.jsx

// GOOD  (crmsystem utils/InvoiceMath.js)
/**
 * getInvoiceFigures(): the one place that works out an invoice's paid, returned, refunded,
 * credit-used and due amounts.
 *
 * 1) STANDALONE (no sourceOrderId): a return / credit note does NOT change summary.paidAmount.
 * 2) ORDER-LINKED (has a sourceOrderId): the backend keeps summary.paidAmount NET of refunds,
 *    so show "Paid" exactly as the backend sent it.
 *
 * Used by: components/invoice/InvoiceDetailModal.jsx, pages/InvoiceListPage.jsx, utils/InvoicePdf.js
 */

// GOOD  (OrderManagement pages/InvoiceListPage.jsx)
/**
 * All invoices grouped by customer, with source tabs (client / manual order / ecommerce / old /
 * direct), agent filter, fuzzy search, PDF, statement and Excel export.
 *
 * Route: /invoices
 * Used by: routes/AppRoutes.jsx
 * API: CreditNoteService.getAll, InvoiceService.getAllInvoices,
 * InvoiceService.getCustomerInvoicesById, InvoiceService.getCustomers,
 * InvoiceService.getInvoiceById, InvoiceService.getInvoicesByMonthYear
 */
```

**8.3 Every exported function and custom hook has JSDoc** (purpose, `@param`, `@returns`). We do not use TypeScript,
so shared data shapes are written once as `@typedef` and referenced everywhere.

```js
/**
 * @typedef {Object} InvoiceLine
 * @property {number} qty            Units sold.
 * @property {number} price          Unit price in rupees, before discount.
 * @property {number} discountValue  Discount on the whole line, in rupees.
 */

/**
 * Net total of all invoice lines after line discounts. Never below 0.
 * @param {InvoiceLine[]} items
 * @returns {number} Rupees, rounded to paise.
 */
export function calculateItemsNetTotal(items) { ... }
```

**8.4 Every business rule has a comment with a worked numeric example.**

```js
// A returned item is refunded at its share of the order discount, not its list price.
// Example: items ₹1,000, order discount ₹100 (10%), one ₹200 item returned → refund ₹180.
```

**8.5 Never commit commented-out code. Git is the history.**

```js
// BAD  (OrderManagement CreateInvoicePage.jsx started with ~500 lines of its own old version)
// import React, { useState, useEffect, useMemo } from 'react';
// const CreateInvoicePage = () => { ...

// GOOD: delete it. To see the old version: git log -p -- src/pages/CreateInvoicePage.jsx
```

**8.6 TODOs have an owner and a date. Comments are English only, no emojis, no jokes.**

```js
// BAD   // TODO: confirm this permission slug
// BAD   // Paid invoice ko poora received maano          (crmsystem InvoiceMath.js, Hindi)
// BAD   // settle it in the same step ("Tarika A")        (OrderManagement, Hindi label)
// BAD   // Replace the old fetchActiveProducts with this   (Digi-Ecom, a note to yourself)
// BAD   console.log("🔥 OauthSuccess mounted");           (Digi-Ecom OauthSuccessPage.jsx)
// GOOD
// TODO(ravi, 2026-11-01): confirm "invoice.manage.read" matches the Permission collection.
// A paid invoice counts as fully received, even if paidAmount was not updated.
```

---

## 9. Errors, logging and security

**9.1 No `console.log` in committed code.** Use `utils/Logger.js`, which prints in development and is silent in
production. **Never log tokens, passwords, OTPs or personal data**, not even in development.

```js
// BAD  (Digi-Ecom OauthSuccessPage.jsx, AuthSlice.js)
console.log("Received token:...........", token);
console.log("Fetched user profile:", data);

// GOOD
logger.debug("OAuth callback received", { hasToken: Boolean(token) });
```

**9.2 No empty or silent `catch`.** Either handle the error (show a message), or explain why it is safe to ignore
and log it.

```js
// BAD  (OrderManagement StatementPdf.js)
try { doc.addImage(watermarkLogo, ...); } catch {}

// GOOD
} catch (error) {
  // The watermark is decorative: the statement is still valid without it.
  logger.warn("Statement PDF watermark failed", error);
}
```

**9.3 Every screen that loads data has three states**: loading, empty and error, each with a human message.
"No invoices for March 2026" beats an empty table. "Could not load invoices. Please try again." beats a blank page.

**9.4 Validate input before calling the API**, with a function in `validators/`, and show the message next to the
field. Never trust that the API will catch it.

**9.5 Secrets never go in frontend code.** Only public values (`VITE_API_BASE_URL`) go in `.env`. Everything in a
Vite bundle can be read by anyone.

---

## 10. Formatting and imports

**10.1 Prettier decides formatting.** Do not discuss formatting in reviews. Settings (`.prettierrc.json`), chosen
from the style the repos already use: 2 spaces, double quotes, semicolons, trailing commas where ES5 allows,
line width 100, LF line endings. `.editorconfig` makes every editor match.

**10.2 Imports in five groups**, with a blank line between groups:

```js
import { useMemo, useState } from "react";                 // 1. React
import { X, Loader2 } from "lucide-react";                  // 2. third-party packages
import toast from "react-hot-toast";

import { InvoiceService } from "../../backend/ApiService";  // 3. internal (backend, utils, constants, hooks)
import { formatCurrency } from "../../utils/Format";

import { Field, TextInput } from "../ui/FormField";         // 4. relative components

import "./InvoicePrint.css";                                // 5. CSS
```

With the automatic JSX runtime, do not `import React from "react"` unless you use `React.something`.
A `@/` alias for `src/` may be added later, in its own PR.

---

## 11. Testing

**11.1 Every pure function in `utils/` has Vitest tests** next to it (`InvoiceMath.test.js`). Money, GST, refunds and
credit-note maths come first. Always test rounding edges (x.xx5), zero, negative and 100% discount.

**11.1a Old code:** some older files are still larger than the limits (for example `CreateInvoicePage.jsx`,
`InvoiceFormPage.jsx`, `CreateCreditNoteModal.jsx`). Do not rewrite them in one go. When you change one, leave it a
little better: move the part you touched into a component, hook or util (with a test), in a separate refactor PR.

**11.2 Before moving existing logic, pin it.** First write *characterisation tests* that record what the current
code returns, then move the code. The tests must pass unchanged.

```js
import { describe, expect, it } from "vitest";
import { calculateItemsNetTotal } from "./InvoiceMath";

describe("calculateItemsNetTotal", () => {
  it("rounds to paise after discounts", () => {
    expect(calculateItemsNetTotal([{ qty: 3, price: 33.335, discountValue: 0 }])).toBe(100.01);
  });
  it("never goes below zero", () => {
    expect(calculateItemsNetTotal([{ qty: 1, price: 100, discountValue: 150 }])).toBe(0);
  });
});
```

---

## 12. Git and review

- **Conventional Commits:** `feat: add credit note filter`, `fix: round GST per line`,
  `refactor: move invoice totals to utils`, `docs: update glossary`, `chore: bump vite`.
- **Small PRs:** one concern per PR, ideally under 400 changed lines. A refactor PR never changes behaviour.
- **The author ticks the checklist below** (it is `.github/pull_request_template.md`). The reviewer checks it.

---

## Appendix A: File templates

Copy these when you create a new file.

**Component**

```jsx
/**
 * One invoice line with quantity, price and line total. Totals come from utils/InvoiceMath,
 * never computed here.
 *
 * Used by: components/invoice/InvoiceItemsTable.jsx
 */
import { formatCurrency } from "../../utils/Format";
import { calculateLineTotal } from "../../utils/InvoiceMath";

/**
 * @param {{ line: InvoiceLine, onRemove: (lineId: string) => void }} props
 */
export default function InvoiceLineRow({ line, onRemove }) {
  const lineTotal = calculateLineTotal(line);
  const handleRemoveClick = () => onRemove(line.lineId);

  return (
    <tr>
      <td>{line.description}</td>
      <td>{line.qty}</td>
      <td>{formatCurrency(lineTotal)}</td>
      <td><button onClick={handleRemoveClick}>Remove</button></td>
    </tr>
  );
}
```

**Custom hook**

```js
/**
 * Loads credit notes for one customer and exposes loading / error state.
 *
 * Used by: pages/CreditNotesPage.jsx, pages/CustomerDetailPage.jsx
 * API: CreditNoteService.getAll
 */
import { useEffect, useState } from "react";
import { CreditNoteService } from "../backend/ApiService";

/**
 * @param {string} customerId
 * @returns {{ creditNotes: CreditNote[], isLoading: boolean, error: Error | null }}
 */
export function useCreditNotes(customerId) {
  const [creditNotes, setCreditNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    CreditNoteService.getAll({ customerId })
      .then(setCreditNotes)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [customerId]);

  return { creditNotes, isLoading, error };
}
```

**Utility (pure function)**

```js
/**
 * Invoice money maths. Pure functions only: no React, no API calls. Tested in InvoiceMath.test.js.
 */

/**
 * Round rupees to 2 decimals, half up (the money rule, section 4.3).
 * @param {number} amountInRupees
 * @returns {number}
 */
export function roundToPaise(amountInRupees) {
  return Math.round((Number(amountInRupees) + Number.EPSILON) * 100) / 100;
}

/**
 * Line total = qty × price − discount, rounded to paise. Never below 0.
 * Example: 3 × ₹33.335 − ₹0 = ₹100.01.
 * @param {InvoiceLine} line
 * @returns {number} Rupees.
 */
export function calculateLineTotal(line) {
  const grossAmount = Number(line.qty || 0) * Number(line.price || 0);
  return Math.max(roundToPaise(grossAmount - Number(line.discountValue || 0)), 0);
}
```

**Constants**

```js
/**
 * Invoice defaults and limits shared by the invoice pages and exports.
 */
export const INVOICE_DEFAULTS = {
  DUE_IN_DAYS: 10,
  MONTHLY_EXPORT_LIMIT: 500,
};
```

---

## Appendix B: Review checklist (Definition of Done)

- [ ] I can answer, for every file I touched: what it does, what data it needs, who uses it, which rule it protects.
- [ ] Names are full words; booleans, handlers and props follow section 1; business words match the glossary.
- [ ] Every touched file is under 300 lines; functions under 40; no nested ternaries; nesting ≤ 3.
- [ ] No calculation or formatting in JSX; maths lives in `utils/` with tests; API calls in `backend/`.
- [ ] No copy-pasted layout; no raw hex colours; no magic numbers or repeated strings.
- [ ] File header present; JSDoc on new exports; business rules have a worked example.
- [ ] No commented-out code, no `console.log`, no empty `catch`, nothing sensitive logged.
- [ ] Loading, empty and error states exist on every screen I touched.
- [ ] `npm run lint` shows no new warnings; `npm run format:check` and `npm test` pass.
- [ ] Commit messages follow Conventional Commits. If behaviour changes, the PR says so and how it was tested.
