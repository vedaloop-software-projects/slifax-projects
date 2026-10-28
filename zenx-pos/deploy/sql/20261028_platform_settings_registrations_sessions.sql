-- Super-admin key/value settings. renewal_grace_days: days a client keeps full
-- access after its contract end date before it becomes inactive (renewal only).
-- max_devices_per_user: default number of devices one login may use at once.
CREATE TABLE IF NOT EXISTS `platform_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` VARCHAR(1000) NOT NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `platform_settings_key_unique` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `platform_settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES ('renewal_grace_days', '7', NOW(), NOW()), ('max_devices_per_user', '1', NOW(), NOW())
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;

-- Public self-registration requests reviewed by the super admin.
CREATE TABLE IF NOT EXISTS `registration_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `business_name` VARCHAR(255) NOT NULL,
  `contact_person_name` VARCHAR(255) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `business_type_id` BIGINT UNSIGNED NULL,
  `city` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `client_id` BIGINT UNSIGNED NULL,
  `reviewed_by` BIGINT UNSIGNED NULL,
  `review_note` TEXT NULL,
  `reviewed_at` TIMESTAMP NULL DEFAULT NULL,
  `requester_ip` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `registration_requests_status_index` (`status`, `created_at`),
  KEY `registration_requests_mobile_index` (`mobile`, `status`),
  KEY `registration_requests_email_index` (`email`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One active session per client user (single-device login).
CREATE TABLE IF NOT EXISTS `client_user_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `session_id` CHAR(64) NOT NULL,
  `device_id` VARCHAR(191) NOT NULL,
  `device_name` VARCHAR(255) NULL,
  `platform` VARCHAR(50) NULL,
  `ip_address` VARCHAR(64) NULL,
  `location` VARCHAR(255) NULL,
  `last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `revoked_reason` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_user_sessions_session_unique` (`session_id`),
  KEY `client_user_sessions_user_active_index` (`user_id`, `revoked_at`, `expires_at`),
  KEY `client_user_sessions_client_active_index` (`client_id`, `revoked_at`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "New login attempt" alerts shown on the device that holds the active session.
CREATE TABLE IF NOT EXISTS `client_login_alerts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `device_name` VARCHAR(255) NULL,
  `platform` VARCHAR(50) NULL,
  `ip_address` VARCHAR(64) NULL,
  `location` VARCHAR(255) NULL,
  `seen_at` TIMESTAMP NULL DEFAULT NULL,
  `response` VARCHAR(20) NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_login_alerts_user_index` (`user_id`, `seen_at`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-client override of max_devices_per_user; NULL uses the platform default.
ALTER TABLE `users` ADD COLUMN `max_login_devices` INT NULL;
