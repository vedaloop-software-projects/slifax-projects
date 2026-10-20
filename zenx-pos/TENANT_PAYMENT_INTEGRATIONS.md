# Tenant payment integrations

ZenxPOS now treats payment gateways as tenant-scoped integrations.

## Workflow

1. A tenant opens **Settings → Payment Integrations** and requests an available provider.
2. The request appears in **Super Admin → Integrations**.
3. The technical team reviews the request and enters that tenant's provider credentials, environment, callback URL, and allowed payment methods.
4. The backend encrypts the credentials with AES-256-GCM before writing them to MySQL. Credential values are never returned through tenant or admin APIs.
5. After activation, only that tenant can initialize and use the provider.

Pine Labs uses its current OAuth client-credentials and hosted checkout APIs. Checkout attempts are recorded in `payment_gateway_transactions` by tenant, provider, merchant reference, external order ID, amount, and status.

## Deployment

Apply `deploy/sql/20261021_tenant_integrations.sql`, then add a stable encryption key to the protected deployment `app.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```dotenv
INTEGRATION_CREDENTIALS_MASTER_KEY=<generated-base64-value>
```

Do not rotate this key by replacing it directly. Existing tenant credentials cannot be decrypted with a different key. A future rotation must decrypt and re-encrypt every credential envelope in a controlled migration.

## APIs

Tenant APIs require the normal bearer token:

- `GET /api/integrations`
- `POST /api/integrations/:provider/request`
- `POST /api/integrations/:provider/initialize`
- `POST /api/integrations/pinelabs/checkout`

Super-admin APIs require the existing admin session cookie:

- `GET /admin/integration-requests`
- `POST /admin/integration-requests/:id/configure`
- `POST /admin/integration-requests/:id/status`

Pine Labs checkout accepts an amount explicitly in paise to avoid currency rounding ambiguity:

```json
{
  "merchantOrderReference": "BILL_20261021_1001",
  "amountInPaise": 41500,
  "notes": "Retail invoice 1001",
  "customer": {
    "firstName": "Customer",
    "mobileNumber": "9999999999"
  }
}
```
