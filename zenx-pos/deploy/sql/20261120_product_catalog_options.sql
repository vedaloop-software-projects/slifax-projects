ALTER TABLE `products`
  ADD COLUMN `add_ons` JSON NULL;

ALTER TABLE `product_variants`
  ADD COLUMN `vip_price` DOUBLE NULL;

ALTER TABLE `product_controls`
  ADD COLUMN `dine_in_available` TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN `take_away_available` TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN `is_combo` TINYINT NOT NULL DEFAULT 0,
  ADD COLUMN `is_raw_material` TINYINT NOT NULL DEFAULT 0;
