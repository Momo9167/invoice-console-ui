# invoice-console-ui

Frontend for **Mooe Console** — quotations, invoices, payment history, customers & items, English/Myanmar. Backend: [invoice-service](https://github.com/Momo9167/invoice-service).

- Next.js 15 (App Router, React 19, TypeScript)
- All `/api/*` requests are forwarded to invoice-service (`API_URL`), so the browser talks to one origin and the login cookie just works
- Pages require login (username + password; cookie checked with the same `AUTH_SECRET` as the backend)
- Stock: Stock levels per location, Purchase orders, Transfers (Myawaddy → Bago → Yangon), invoice “Take stock from”, serial-number tracking
- `src/components/Sheet.tsx` is the A4 document used for the live preview, printing, and PDF export (`/print/[id]`)

## Run locally

Start [invoice-service](https://github.com/Momo9167/invoice-service) first (port 3200), then:

```bash
cp .env.example .env    # API_URL=http://localhost:3200, AUTH_SECRET = same as the backend
npm install
npm run dev             # http://localhost:3100
```

## Deploy (Vercel)

1. vercel.com → **Add New → Project** → import `invoice-console-ui`.
2. **Settings → Environment Variables**: `API_URL` (the backend's Vercel URL, e.g. `https://invoice-service.vercel.app`), `AUTH_SECRET` (same value as the backend).
3. Deploy. Then set the backend's `FRONTEND_URL` to this project's URL and redeploy the backend.

## Layout

```
src/app/(app)/          documents list, editor, master data, settings
src/app/login/          login screen
src/app/print/[id]/     bare A4 page rendered to PDF by the backend
src/components/         Editor, PaymentsPanel, Picker, SerialInput, Sheet, …
src/lib/calc.ts         totals, statuses, due dates (same file as the backend)
src/lib/i18n.ts         English / Myanmar text
```

Shortcuts: Cmd+S save · Cmd+E export PDF · Cmd+P print
