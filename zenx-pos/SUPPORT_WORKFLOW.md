# Support incident workflow

ZenxPOS stores automatic failures and customer-submitted support requests in `support_incidents`.

## Priority routing

- **P1**: HTTP 5xx failures, database failures, or a customer-selected critical incident. A P1 email is sent immediately.
- **P2**: HTTP 4xx API warnings and customer-selected warning or UI incidents. The incident includes recommended resolution steps.
- **P3**: General customer requests. P3 is the default choice in Help & Support.

Repeated automatic failures with the same endpoint, status, and message are grouped for 15 minutes. Their occurrence count increases instead of sending repeated P1 emails.

## Gmail SMTP configuration

Add these values to the protected deployment `app.env`. Do not commit real credentials.

```dotenv
SUPPORT_SMTP_HOST=smtp.gmail.com
SUPPORT_SMTP_PORT=465
SUPPORT_SMTP_SECURE=true
SUPPORT_SMTP_USER=support@example.com
SUPPORT_SMTP_APP_PASSWORD=<google-app-password>
SUPPORT_EMAIL_FROM=support@example.com
SUPPORT_EMAIL_TO=developer@example.com,operations@example.com
```

Use a Google account with 2-Step Verification enabled and create an App Password for SMTP. Store the generated password in the server secret file without spaces. Incidents are still saved when email is not configured or delivery fails. A database outage that prevents saving its own P1 incident still sends the email when SMTP is available.

## Operations

Customers submit requests from **Help & Support**. Super administrators review them under **Support Incidents**, update the resolution steps, move an incident to **In progress**, and mark it **Resolved**.

Apply `deploy/sql/20261022_support_incidents.sql` before deploying the application version that uses this workflow. The migration also registers Cashfree as an available tenant payment integration.
