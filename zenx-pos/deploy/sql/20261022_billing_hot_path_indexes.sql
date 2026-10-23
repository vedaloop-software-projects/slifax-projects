ALTER TABLE `billing_settings`
  ADD INDEX `billing_settings_client_id_index` (`client_id`);

ALTER TABLE `temp_bill_tran`
  ADD INDEX `temp_bill_tran_billing_item_index` (`client_id`, `user_id`, `product_id`, `variant_id`);

ALTER TABLE `bill_busters`
  ADD INDEX `bill_busters_applicable_index` (`client_id`, `status`, `bill_amount`, `from_date`, `to_date`);

ALTER TABLE `child_bill_busters`
  ADD INDEX `child_bill_busters_client_parent_index` (`client_id`, `bill_buster_id`);
