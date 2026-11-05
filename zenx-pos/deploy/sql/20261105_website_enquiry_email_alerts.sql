-- Durable superadmin email delivery, independent from enquiry/read status.
-- Existing enquiries intentionally remain not_requested: do not email historical contacts.
-- New API inserts explicitly queue email_status=pending in the same transaction.
ALTER TABLE `website_enquiries`
  ADD COLUMN `email_status` VARCHAR(20) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN `email_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN `email_next_attempt_at` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `email_lease_token` CHAR(36) NULL,
  ADD COLUMN `email_lease_expires_at` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `email_sent_at` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN `email_last_error` VARCHAR(100) NULL,
  ADD INDEX `website_enquiries_email_queue_index` (`email_status`, `email_next_attempt_at`);
