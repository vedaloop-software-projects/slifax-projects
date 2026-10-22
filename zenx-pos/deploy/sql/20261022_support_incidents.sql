CREATE TABLE IF NOT EXISTS `support_incidents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `source` VARCHAR(20) NOT NULL,
  `priority` VARCHAR(2) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `resolution_steps` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `request_id` VARCHAR(64) NULL,
  `method` VARCHAR(10) NULL,
  `path` VARCHAR(500) NULL,
  `status_code` INT NULL,
  `signature` CHAR(64) NULL,
  `occurrence_count` INT NOT NULL DEFAULT 1,
  `first_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `support_incidents_priority_status_index` (`priority`, `status`, `last_seen_at`),
  KEY `support_incidents_client_status_index` (`client_id`, `status`, `last_seen_at`),
  KEY `support_incidents_signature_index` (`signature`, `last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `integration_providers` (`code`,`name`,`category`,`description`,`credential_schema`,`status`,`created_at`,`updated_at`)
VALUES ('cashfree','Cashfree','payment_gateway','Cashfree payment gateway',
  JSON_ARRAY(
    JSON_OBJECT('key','clientId','label','App ID','secret',false,'required',true),
    JSON_OBJECT('key','clientSecret','label','Secret Key','secret',true,'required',true)
  ),1,NOW(),NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`description`=VALUES(`description`),`credential_schema`=VALUES(`credential_schema`),`status`=1,`updated_at`=NOW();
