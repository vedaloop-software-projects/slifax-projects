CREATE TABLE IF NOT EXISTS `password_reset_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `requester_type` VARCHAR(20) NOT NULL,
  `requester_id` BIGINT UNSIGNED NOT NULL,
  `client_id` BIGINT UNSIGNED NULL,
  `assigned_level` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `resolved_by_type` VARCHAR(20) NULL,
  `resolved_by_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `password_reset_requests_queue_index` (`assigned_level`, `status`, `requested_at`),
  KEY `password_reset_requests_requester_index` (`requester_type`, `requester_id`, `status`),
  KEY `password_reset_requests_client_queue_index` (`client_id`, `assigned_level`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
