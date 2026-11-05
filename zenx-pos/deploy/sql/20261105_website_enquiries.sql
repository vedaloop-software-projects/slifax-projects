-- Website quote/contact inbox. Independent of account registration requests.
-- Apply before deploying the backend routes. This migration does not change legacy data.
-- Business type IDs are validated against active business_types by the API;
-- the name is snapshotted to keep submitted details readable after catalogue changes.
CREATE TABLE IF NOT EXISTS `website_enquiries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `submission_id` CHAR(36) NOT NULL,
  `payload_hash` CHAR(64) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `selected_plan` VARCHAR(30) NULL,
  `business_name` VARCHAR(255) NOT NULL,
  `contact_person_name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `business_type_id` BIGINT UNSIGNED NULL,
  `business_type_name` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `subject` VARCHAR(100) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'new',
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  `read_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `requester_ip` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `website_enquiries_submission_unique` (`submission_id`),
  KEY `website_enquiries_status_index` (`status`, `created_at`),
  KEY `website_enquiries_type_index` (`type`, `created_at`),
  KEY `website_enquiries_unread_index` (`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
