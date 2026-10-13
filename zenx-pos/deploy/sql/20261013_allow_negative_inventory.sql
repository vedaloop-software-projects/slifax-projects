-- Run once against each ZenxPOS database before deploying the matching backend.
-- Safe to rerun on MySQL 8.0+. MySQL does not support ADD COLUMN IF NOT
-- EXISTS consistently, so use a metadata guard and dynamic DDL.
SET @allow_negative_inventory_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'billing_settings'
    AND COLUMN_NAME = 'allow_negative_inventory'
);
SET @allow_negative_inventory_ddl = IF(
  @allow_negative_inventory_exists = 0,
  'ALTER TABLE `billing_settings` ADD COLUMN `allow_negative_inventory` TINYINT NOT NULL DEFAULT 1 AFTER `exclusive_gst_billing`',
  'SELECT 1'
);
PREPARE allow_negative_inventory_statement FROM @allow_negative_inventory_ddl;
EXECUTE allow_negative_inventory_statement;
DEALLOCATE PREPARE allow_negative_inventory_statement;

-- Keep the default consistent when an earlier version of this migration already
-- added the column. Existing tenant choices remain unchanged.
ALTER TABLE `billing_settings`
  ALTER COLUMN `allow_negative_inventory` SET DEFAULT 1;
