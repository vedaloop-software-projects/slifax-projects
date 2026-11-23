-- Product sourcing: which suppliers a product is bought from, and a supplier's usual
-- discount.
--
-- suppliers.discount_percent: the discount the supplier normally gives, shown on the
-- supplier and on the product's supplier cards. Information only; documents keep their
-- own line discounts.
-- product_suppliers: the suppliers chosen for a product on the product form. A product
-- can have several; the preferred supplier for Auto PO stays per variant in
-- product_purchase_settings.preferred_supplier_id.
ALTER TABLE `suppliers` ADD COLUMN `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `product_suppliers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `supplier_id` BIGINT UNSIGNED NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_suppliers_unique` (`client_id`, `product_id`, `supplier_id`),
  KEY `product_suppliers_supplier_index` (`client_id`, `supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
