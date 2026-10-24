# Digident CRM

Sales CRM for the Digident team: inquiries come in (by hand or Excel import), agents call and follow up, converted leads become clients, and clients get invoices and credit notes. Admins assign leads and see agent performance. There is no react-router: screens are switched by a page key in src/routes/AppRoutes.jsx and pages call onNav(pageKey, payload).

## Run it

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev            # http://localhost:5173
```
