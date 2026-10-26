-- Nullable distinguishes historical transfers (no sale-price snapshot) from a
-- genuine zero sale price. Historical reports fall back to current master sale
-- price; all new/completed transfers and adjustments save their actual price.
ALTER TABLE transfer_in_tran ADD COLUMN sale_price DECIMAL(15,3) NULL;
ALTER TABLE transfer_out_tran ADD COLUMN sale_price DECIMAL(15,3) NULL;
ALTER TABLE stock_adjustments_tran ADD COLUMN sale_price DECIMAL(15,3) NULL;
