ALTER TABLE `categories`
  ADD COLUMN `printer_name` VARCHAR(255) NULL,
  ADD COLUMN `connection_type` VARCHAR(50) NULL,
  ADD COLUMN `printer_address` VARCHAR(255) NULL;
