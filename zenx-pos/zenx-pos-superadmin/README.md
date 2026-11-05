# ZenxPOS Super Admin

React control center for the legacy `dev/admin` workflows. Client onboarding, account management, contracts, feature access, and logo uploads are handled in one client-management flow.

## Local development

1. Start `zenx-pos-backend` on port `5100`.
2. Run `npm install` in this folder.
3. Run `npm run dev` and open `http://127.0.0.1:5173`.

Vite proxies `/admin` and `/uploads` to the local backend, so the signed HttpOnly admin cookie remains same-origin. In production, publish the frontend and reverse-proxy `/admin` and `/uploads` to the Node backend under the same origin. Keep `VITE_API_BASE_URL` empty for that deployment. The backend intentionally uses a strict same-site session cookie and marks it `Secure` when the request arrived over HTTPS.

## Screen coverage

- Super-admin login, session restoration, logout, dashboard, and password change.
- CRUD screens for business types, features, sub-features, administrators, key mappings, bill columns, coupon usage types, and bill formats.
- Client onboarding/editing with an existing/new logo preview, activation, deletion, feature assignment, contract details, payments, collection reporting, and client drill-down.
- Website Enquiries inbox for website quote requests and contact messages, with type/status filters, pagination, full enquiry details, read tracking, and New/In progress/Closed status updates.

## Website enquiry notifications

Before rolling out this inbox, deploy the backend's website-enquiry routes and apply `zenx-pos/deploy/sql/20261105_website_enquiries.sql` followed by `zenx-pos/deploy/sql/20261105_website_enquiry_email_alerts.sql`. The original bootstrap schema alone is insufficient. Backend startup does not migrate the database automatically; the normal deployment workflow applies pending SQL migrations.

The authenticated header links to `#/website-enquiries` and polls `/admin/website-enquiries/summary` every 30 seconds while the page is visible, and again on focus or after an enquiry is marked read. Polling updates only the unread badge; it does not reload an open inbox or disrupt its detail dialog. A failed count request displays an unavailable indicator instead of reporting zero.

Enquiry list, count, read and status requests time out after 15 seconds so failed connections can be retried. Polling is cancelled when the authenticated shell unmounts and suspended while the document is hidden.

Opening an unread enquiry marks it read only after the backend confirms the update. Failed list, read, or status requests show a retryable error. The detail dialog preserves the original subject, multiline message, plan, business/contact information, and submission reference. Email and telephone links open the administrator's chosen application. No native browser notifications are sent.

The backend queues an internal email alert for each new website submission, using `ENQUIRY_EMAIL_TO` or the existing `SUPPORT_EMAIL_TO` recipients and the support SMTP configuration. Reading an enquiry or updating its status does not send another email. Alerts retry independently of the dashboard, so a mail failure does not hide an enquiry. Existing historical enquiries are not emailed. See the [backend email configuration and delivery notes](../zenx-pos-backend/README.md#enquiry-email-configuration-and-delivery) for overrides, retries, and the possibility of rare duplicate delivery. Live mail delivery has not been verified in this change.

All screens call the Node backend under `/admin`; the backend stores and reads the corresponding records through Prisma and MySQL.

## Checks

```bash
npm run build
npm run lint
```

The backend must contain the ZenxPOS schema. The reviewed bootstrap SQL is at `zenx-pos-backend/models/database/schema/tidb-bootstrap.sql`.
