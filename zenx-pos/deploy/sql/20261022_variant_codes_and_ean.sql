ALTER TABLE `product_variants`
  ADD COLUMN `variant_code` VARCHAR(255) NULL AFTER `client_id`,
  ADD COLUMN `ean_code` VARCHAR(255) NULL AFTER `variant_code`;

UPDATE `product_variants` AS pv
JOIN `products` AS p ON p.`id` = pv.`product_id` AND p.`client_id` = pv.`client_id`
LEFT JOIN (
  SELECT `client_id`, `product_id`, MIN(`id`) AS `first_variant_id`
  FROM `product_variants`
  GROUP BY `client_id`, `product_id`
) AS first_variant ON first_variant.`client_id` = pv.`client_id` AND first_variant.`product_id` = pv.`product_id`
SET
  pv.`variant_code` = CONCAT(p.`product_code`, '-V', pv.`id`),
  pv.`ean_code` = CASE WHEN pv.`id` = first_variant.`first_variant_id` THEN NULLIF(TRIM(p.`ean_code`), '') ELSE NULL END;

ALTER TABLE `product_variants`
  MODIFY COLUMN `variant_code` VARCHAR(255) NOT NULL,
  ADD INDEX `product_variants_client_variant_code_index` (`client_id`, `variant_code`, `status`, `trash`),
  ADD INDEX `product_variants_client_ean_code_index` (`client_id`, `ean_code`, `status`, `trash`);

ALTER TABLE `products`
  DROP INDEX `products_ean_code_index`,
  DROP COLUMN `ean_code`,
  ADD INDEX `products_client_code_status_index` (`client_id`, `product_code`, `status`, `trash`);
