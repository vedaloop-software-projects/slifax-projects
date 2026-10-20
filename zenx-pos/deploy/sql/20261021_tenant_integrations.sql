CREATE TABLE IF NOT EXISTS `integration_providers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'payment_gateway',
  `description` varchar(500) DEFAULT NULL,
  `credential_schema` json NOT NULL,
  `status` tinyint NOT NULL DEFAULT 1,
  `created_by` bigint unsigned DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `integration_providers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_integration_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'requested',
  `tenant_notes` varchar(1000) DEFAULT NULL,
  `admin_notes` varchar(1000) DEFAULT NULL,
  `requested_by` bigint unsigned NOT NULL,
  `handled_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_integration_requests_client_provider_unique` (`client_id`,`provider_id`),
  KEY `tenant_integration_requests_status_index` (`status`),
  KEY `tenant_integration_requests_provider_index` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenant_integrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `environment` varchar(20) NOT NULL DEFAULT 'sandbox',
  `encrypted_credentials` longtext NOT NULL,
  `public_config` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `configured_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_integrations_client_provider_unique` (`client_id`,`provider_id`),
  KEY `tenant_integrations_status_index` (`status`),
  KEY `tenant_integrations_provider_index` (`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_gateway_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `provider_id` bigint unsigned NOT NULL,
  `merchant_reference` varchar(50) NOT NULL,
  `external_order_id` varchar(100) NOT NULL,
  `amount_in_paise` bigint unsigned NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `status` varchar(30) NOT NULL DEFAULT 'created',
  `redirect_url` text DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_gateway_transactions_reference_unique` (`client_id`,`provider_id`,`merchant_reference`),
  KEY `payment_gateway_transactions_order_index` (`external_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `integration_providers`
  (`code`,`name`,`category`,`description`,`credential_schema`,`status`,`created_at`,`updated_at`)
VALUES
  ('pinelabs','Pine Labs','payment_gateway','Pine Labs online payment gateway',
   JSON_ARRAY(
     JSON_OBJECT('key','clientId','label','Client ID','secret',false,'required',true),
     JSON_OBJECT('key','clientSecret','label','Client Secret','secret',true,'required',true),
     JSON_OBJECT('key','merchantId','label','Merchant ID','secret',false,'required',false)
   ),1,NOW(),NOW()),
  ('phonepe','PhonePe','payment_gateway','PhonePe payment gateway',
   JSON_ARRAY(
     JSON_OBJECT('key','clientId','label','Client ID','secret',false,'required',true),
     JSON_OBJECT('key','clientSecret','label','Client Secret','secret',true,'required',true),
     JSON_OBJECT('key','clientVersion','label','Client Version','secret',false,'required',true)
   ),1,NOW(),NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`),`description`=VALUES(`description`),`credential_schema`=VALUES(`credential_schema`),`updated_at`=NOW();
