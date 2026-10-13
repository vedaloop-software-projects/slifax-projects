# Billing endpoint design audit

Audit date: 13 October 2026

This audit compares the supplied Laravel examples with the current Node implementation. Laravel parity is not the target by itself. The target is a stable Node contract that preserves required billing behavior, uses explicit DTOs, and is practical for daily POS operations.

## Decision rules

- Keep a Node response when it is deliberately simpler or avoids repeated data.
- Do not expose Prisma rows as a public response contract.
- Preserve business behavior such as promotion calculation, GST recalculation, stock movement, refunds, printing, and reconciliation even when the response is redesigned.
- Use one documented representation for IDs, money, quantities, and dates across all endpoints.
- Treat request compatibility separately from response design. Legacy numeric strings and blank optional fields may be accepted at the boundary without weakening internal types.

## Endpoint findings

| Endpoint | Current assessment | Decision |
|---|---|---|
| `searchEanCode` | The original Node response separated `products` and `variants`, avoiding repeated product fields. The current compatibility work flattens it into Laravel-style variant rows. | **Keep the Node concept.** Publish explicit camelCase product and variant DTOs instead of raw Prisma rows. Do not retain the Laravel flattened response solely for parity. |
| `searchProducts` | Tenant-scoped, active-only, bounded, and rejects unbounded empty searches. A flat variant result is useful for a search-results grid. | **Node is better. Keep.** |
| `getCustomerByMobile` | Explicit camelCase DTO, tenant filter, active filter, numeric IDs, and stable dates. | **Good. Keep.** |
| `addCustomer` | Reused master-data endpoint rather than duplicate billing logic. | **Good architecture. Keep.** |
| `addProductToTemp` | Node correctly ignores client-supplied catalogue prices and reads price/tax from the database. The effective `price_override` is now initialized from the server-selected price so bill totals cannot become zero after adding a normal item. | **Node design is better. Keep; document manual-discount handling.** |
| `updateTempProductQty` | Minimal mutation response and server-side GST recalculation. | **Good. Keep.** |
| `updateTempProductSalePrice` | Minimal response and GST recalculation are good. It does not currently enforce `allowPriceOverride`. | **Keep shape; add business-rule enforcement.** |
| `clearTempBill` | Minimal idempotent mutation response. | **Good. Keep.** |
| `updateVoid` | Minimal mutation response and tenant/user-scoped row lookup. | **Good. Keep.** |
| `updateTempProductDiscount` | Request compatibility is fixed, but GST is not recalculated after the discount and `allowDiscount` is not enforced. | **Response is good; calculation behavior needs correction.** |
| `getShortcutKeys` | Small explicit DTO with numeric IDs. | **Good. Keep.** |
| `suspendBill` | Transactional move, stable suspended number, and useful `itemsCount`. | **Good. Keep.** |
| `getProductDetails` | Current Node response exposes raw `{ product, variant }`, returns success with `null` when absent, and omits controls and all promotion eligibility. | **Mismatch and functional gap.** Keep separated sections, but add explicit `product`, `variant`, `controls`, and `promotions` DTOs and return 404 when absent. |
| `getSuspendedItems` | Grouped bill DTO now includes customer, date, count, and item details. | **Good. Keep.** |
| `resumeSuspendedBill` | Transactional and rejects overwriting an active temporary bill. | **Node is safer. Keep.** |
| `getTempBillItems` | Aggregate totals plus `items` is the correct operational shape. It now prevents the frontend from reading `productId` from the wrong level. | **Good. Keep.** Decide separately whether decimals remain fixed strings or become one documented money type. |
| `getTempBillItem` | Same aggregate envelope as the full bill with filtered items. This is consistent for the billing UI. | **Good. Keep.** |
| `updateManualDiscount` | Proportional distribution is useful, but GST and scheme metadata are not recalculated consistently. | **Shape is good; business calculation is incomplete.** |
| `clearManualDiscount` | Response is fine, but Node currently zeroes fields on every row. Laravel also removes free-scheme rows, resets scheme type, and recalculates GST. | **Functional mismatch. Fix backend behavior.** |
| `saveBill` | Serializable transaction, server-derived totals, payment-total validation, active payment-mode validation, stock check at commit, tenant validation, and audit record. | **Node is materially better. Keep.** |
| `getApplicableBillBuster` | Returns raw Prisma bill-buster rows and omits child product/variant choices. | **Mismatch and functional gap.** Return an explicit scheme DTO with children. |
| `applyBillBuster` | Node updates the last temporary row. Laravel creates a distinct scheme row and supports either percentage discount or free product. | **Critical functional mismatch. Fix before production use.** |
| `getFreeProductDetails` | Node filters full temporary-bill rows. The consumer needs only free product/variant details. | **Mismatch. Return a dedicated free-item DTO.** |
| `overingBill` | Node marks only the bill master with magic mode `5`; Laravel updates master and lines and uses mode `3`, including historical bills. | **Behavior mismatch. Define a named cancellation state and update all related records atomically.** |
| `checkRefundBill` | The public response intentionally returns `data: null` after validating existence. | **Compatible. Keep if the UI only needs validation.** |
| `addRefundProductToTemp` | Checks original bill quantity and derives original prices server-side. | **Node is safer. Keep.** Add cumulative-refund protection across earlier refunds. |
| `saveRefundBill` | Uses the same transactional save path and stock restoration. Node requires payment modes while the supplied Laravel request does not. | **Node requirement is defensible, but it is a request-contract mismatch.** Update the frontend or explicitly define a default refund payment mode. |
| `getPrint` | Returns raw master, line, payment, tax, settings, and description tables. It lacks joined names and the presentation-ready business/customer/bill structure. | **Mismatch and public-contract leak. Build an explicit print DTO.** |
| `getDayCloseReport` | Current response has only date, sales, bill count, and payment-mode IDs. It omits names, GST, user totals, expenses, income, and collection reconciliation. | **Incomplete for daily operations. Add a reconciliation DTO.** |
| `dayClose` | Node records a close marker and retains bill tables. This is safer and simpler than Laravel's copy-then-delete archival process. The response lacks useful counts. | **Node architecture is better. Keep retained immutable bills; add counts and close timestamp to the response.** |
| `clearManualDiscount` | See the earlier entry; response compatibility is complete but calculation cleanup is not. | **Backend behavior fix required.** |
| `getBillFormats` | Returns raw snake_case Prisma rows and storage paths. | **Mismatch. Map to an explicit DTO and an externally usable file URL.** |
| `updateBillFormat` | Validates that the format belongs to the applicable business type and returns a minimal mutation response. | **Good. Keep.** |
| `getBillFormatId` | Small stable DTO `{ billFormatId }`. | **Good. Keep.** |

## Priority

1. Correct monetary and promotion behavior: `addProductToTemp`, item/manual discount updates, `clearManualDiscount`, and `applyBillBuster`.
2. Complete data required by billing screens: `getProductDetails`, `getApplicableBillBuster`, and `getFreeProductDetails`.
3. Complete operational output: `getPrint`, `getDayCloseReport`, `dayClose`, and `getBillFormats`.
4. Finalize the preferred structured `searchEanCode` contract and update its consumer test before release.
5. Publish response schemas and contract tests so future Prisma or frontend changes cannot silently alter API shapes.
