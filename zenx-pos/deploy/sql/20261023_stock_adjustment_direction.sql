ALTER TABLE `stock_adjustments_mast`
  ADD COLUMN `stock_type` TINYINT NOT NULL DEFAULT 2 COMMENT '1-IN, 2-OUT' AFTER `stock_adjustment_date`,
  ADD INDEX `stock_adjustments_mast_client_date_type_index` (`client_id`, `stock_adjustment_date`, `stock_type`, `status`);
