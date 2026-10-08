# ZenxPOS Super Admin

React control center for the legacy `dev/admin` workflows and the barcode platform's client administration view.

## Local development

1. Start `zenx-pos-backend` on port `5100`.
2. Run `npm install` in this folder.
3. Run `npm run dev` and open `http://127.0.0.1:5173`.

Vite proxies `/admin` and `/uploads` to the local backend, so the signed HttpOnly admin cookie remains same-origin. In production, publish the frontend and reverse-proxy `/admin` and `/uploads` to the Node backend under the same origin. Keep `VITE_API_BASE_URL` empty for that deployment. The backend intentionally uses a strict same-site session cookie and marks it `Secure` when the request arrived over HTTPS.

## Screen coverage

- Super-admin login, session restoration, logout, dashboard, and password change.
- CRUD screens for business types, features, sub-features, administrators, key mappings, bill columns, coupon usage types, and bill formats.
- Client onboarding/editing, logo upload, activation, deletion, feature assignment, contract details, payments, and collection reporting.
- The barcode super-admin client screen, backed by the same ZenxPOS tenant records, with overview totals, filters, onboarding, user counts, contract details, activation controls, and client drill-down.

All screens call the Node backend under `/admin`; the backend stores and reads the corresponding records through Prisma/TiDB.

## Checks

```bash
npm run build
npm run lint
```

The backend must contain the ZenxPOS schema. The reviewed bootstrap SQL is at `zenx-pos-backend/models/database/schema/tidb-bootstrap.sql`.
