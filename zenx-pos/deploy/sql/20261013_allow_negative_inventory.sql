-- Run once against each ZenxPOS database before deploying the matching backend.
-- Safe to rerun on MySQL 8.0+.
ALTER TABLE `billing_settings`
  ADD COLUMN IF NOT EXISTS `allow_negative_inventory` TINYINT NOT NULL DEFAULT 1
  AFTER `exclusive_gst_billing`;

-- Keep the default consistent when an earlier version of this migration already
-- added the column. Existing tenant choices remain unchanged.
ALTER TABLE `billing_settings`
  ALTER COLUMN `allow_negative_inventory` SET DEFAULT 1;
