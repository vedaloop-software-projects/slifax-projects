# Report corrections — 27 October 2026

The Node backend and `ZENX_POS` app use the same filtered data for report rows, totals, CSV/PDF exports and printing. The app changes are on the existing `sasi-dev` checkout. Nothing has been deployed by this change.

| Area | Result |
| --- | --- |
| GST master | Accepts 0–100, including 0%. Existing percentage uniqueness also covers zero and inactive records; tenant tax writes are serialized to prevent concurrent duplicates. |
| Sales | Summary groups by India calendar date/category/sub-category/brand/tax. Detail groups by date/product/variant across bills, with separate sold/refund quantities. Detail no longer displays Bill No. Group by Tax also separates each date and calculates each rate?s share of that day?s filtered sales. An empty GST filter means all rates. |
| Product filters | Product code, variant code or EAN identify the product and variants. Compact generated codes are supported. Product name fills automatically; one matching variant selects automatically and multiple variants remain selectable. |
| Exports | `exportAll: true` returns all grouped rows from the same authorized, bounded report source. The app exports the applied filters, not unsaved form edits or only the current page. Print Report opens the native print dialog. |
| Stock status | One As on Date field; quantity comparisons `=`, `<`, `>`. Detail includes EAN, GST% and HSN. Summary omits date and product identity columns. Period sales/returns columns are removed. |
| Tax breakup | GST Register checkbox removed. Dynamic columns include all configured active GST rates and every historical rate in the selected transactions, including zero. |
| Transfers/adjustments | Daily groups sum each line's `MRP × Qty`, `CP × Qty` and `Sale Price × Qty`. Total Amount is sales value. Free quantity is separate and is not charged. IN and OUT adjustments remain separate groups. |
| Salesman | Daily commission totals and daily product/variant sales totals; refunds reverse values and header-level salesman assignment is supported. |
| Profit margin | New summary/detail report with saved transaction cost or current master cost selector. Net sales exclude GST; net profit is net sales minus net CP value. Profit % is net profit divided by net sales × 100, with zero-sales percentage shown as 0. Totals calculate the overall percentage rather than adding row percentages. |
| Bill printing | Saved receipt tax rows, preview and thermal printing group by GST percentage and sum taxable/GST values. |

## Deployment

Apply both packaged SQL migrations through the existing migration job before starting the updated backend:

- `deploy/sql/20261027_profit_margin_report.sql`
- `deploy/sql/20261027_report_sale_price_snapshots.sql`

The first registers Profit Margin Report in the existing feature/access system. Existing clients with Sales Report receive the feature; their primary-admin roles receive view access. Grant other roles explicitly through Access Levels. Sign out/in to refresh the app's stored menu permissions.

The second adds nullable saved sale prices to transfer-in, transfer-out and adjustment lines. New/completed entries save the master sale price at that time. Older entries have no recoverable sale-price snapshot: the report uses the current master sale price for those lines and displays a valuation note. Their original saved CP/MRP remain intact.

As-of quantities are reconstructed from current variant quantities and subsequent recorded sales/refunds, completed transfers/adjustments and purchase ledger movements, inside a consistent read snapshot. Unrecorded historical database edits cannot be reconstructed. Catalog classifications, names, codes and GST/HSN shown in stock status come from the current master records.

The existing report source cap (`REPORT_SCAN_LIMIT`, default 50,000 source rows) and maximum 366-day range remain. Reports that exceed the cap request narrower filters instead of silently exporting partial data. Stock's single-date lookup is not a 366-day period report.

## Verification

Automated checks cover daily grouping, India date boundaries, current/archived rows, refunds, empty versus zero GST filters, dynamic tax columns, profit cost bases, negative stock comparisons, code/EAN lookup, all-page exports with applied filters and grouped receipt GST. Backend build, complete backend tests, migration checks and focused app lint/tests were run locally.

Manual staging checks still required after deploying the migrations/backend and rebuilding the app:

1. Create GST 0%; try adding another 0% and editing a different rate to 0%.
2. Sell/refund the same variant in multiple bills on one day and across two days. Compare summary/detail totals and date filters.
3. Search each product report using product code, each variant code, EAN and compact variant barcode. Verify product name and single/multiple variant behavior.
4. Generate enough results for multiple pages; compare CSV, PDF and print totals/row counts with all filtered records.
5. Compare stock as of yesterday/today after sales, refunds, IN/OUT transfers, adjustments and free items. Test zero/negative quantity comparisons.
6. Check tax breakup at 0%, 5%, 12%, 18%, 28% and any other configured rate.
7. Transfer two lines with different saved prices; reconcile each extended value and the summary total.
8. Compare profit using saved cost/current master cost, including refunds and free items. Check access denial for a role without Profit Margin Report.
9. Preview and physically print a bill containing several products at the same GST rate and products at different rates. Each rate must appear once in tax breakup.
