-- Letterhead designed in super admin (Platform setup > Letterhead). Printed on every
-- invoice and quotation PDF. One row per key; 'default' is used for all documents.
-- design is JSON: company details, header/footer heights and positioned elements (mm).
CREATE TABLE IF NOT EXISTS `document_letterheads` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `letterhead_key` VARCHAR(50) NOT NULL,
  `design` MEDIUMTEXT NOT NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_letterheads_key_unique` (`letterhead_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
