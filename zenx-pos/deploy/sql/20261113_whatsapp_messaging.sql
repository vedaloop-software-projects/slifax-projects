-- WhatsApp messaging: stores send ZenxPOS-library templates to their customers from the
-- single ZenxPOS business number. Each client gets a monthly free quota (set by super
-- admin); messages beyond it cost the per-message price, paid from a prepaid wallet or
-- with a Cashfree checkout at send time. Money is kept in paise. Safe to rerun on MySQL 8.0+.

-- Per-client settings on `users` (the client table).
-- whatsapp_enabled: 1 = the store may send (pay per message even with a 0 quota).
-- whatsapp_monthly_quota: free messages per calendar month in the store's time zone.
-- whatsapp_price_paise: price per paid message; NULL = platform default (platform_settings.whatsapp_price_paise).
-- whatsapp_wallet_paise: prepaid balance; changed only together with a whatsapp_wallet_transactions row.
SET @wa_enabled_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_enabled');
SET @wa_enabled_ddl = IF(@wa_enabled_exists = 0, 'ALTER TABLE `users` ADD COLUMN `whatsapp_enabled` TINYINT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE wa_statement FROM @wa_enabled_ddl; EXECUTE wa_statement; DEALLOCATE PREPARE wa_statement;

SET @wa_quota_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_monthly_quota');
SET @wa_quota_ddl = IF(@wa_quota_exists = 0, 'ALTER TABLE `users` ADD COLUMN `whatsapp_monthly_quota` INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE wa_statement FROM @wa_quota_ddl; EXECUTE wa_statement; DEALLOCATE PREPARE wa_statement;

SET @wa_price_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_price_paise');
SET @wa_price_ddl = IF(@wa_price_exists = 0, 'ALTER TABLE `users` ADD COLUMN `whatsapp_price_paise` INT UNSIGNED NULL', 'SELECT 1');
PREPARE wa_statement FROM @wa_price_ddl; EXECUTE wa_statement; DEALLOCATE PREPARE wa_statement;

SET @wa_wallet_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'whatsapp_wallet_paise');
SET @wa_wallet_ddl = IF(@wa_wallet_exists = 0, 'ALTER TABLE `users` ADD COLUMN `whatsapp_wallet_paise` BIGINT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE wa_statement FROM @wa_wallet_ddl; EXECUTE wa_statement; DEALLOCATE PREPARE wa_statement;

-- Template library managed by super admin. Placeholders in `body` are {{name}};
-- {{customer_name}} and {{store_name}} are filled automatically, every other one by the store.
-- provider_template is the approved template name at the WhatsApp provider; parameters are
-- sent in the order the placeholders first appear in `body`.
CREATE TABLE IF NOT EXISTS `whatsapp_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `category` VARCHAR(30) NOT NULL DEFAULT 'marketing',
  `body` TEXT NOT NULL,
  `provider_template` VARCHAR(255) NOT NULL,
  `language` VARCHAR(20) NOT NULL DEFAULT 'en',
  `status` TINYINT NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_by` BIGINT UNSIGNED NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_templates_status_index` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One send: a template to a list of recipients.
-- status: pending_payment (waiting for Cashfree; holds its free messages for 30 minutes)
--         → queued → completed; or expired (never paid).
-- payment_mode: free (all within quota) | wallet | online (Cashfree order `order_id`).
CREATE TABLE IF NOT EXISTS `whatsapp_campaigns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `template_id` BIGINT UNSIGNED NOT NULL,
  `template_name` VARCHAR(100) NOT NULL,
  `variables` JSON NOT NULL,
  `recipient_count` INT UNSIGNED NOT NULL,
  `free_count` INT UNSIGNED NOT NULL,
  `paid_count` INT UNSIGNED NOT NULL,
  `price_paise` INT UNSIGNED NOT NULL,
  `amount_paise` BIGINT UNSIGNED NOT NULL,
  `payment_mode` VARCHAR(10) NOT NULL,
  `order_id` VARCHAR(50) NULL,
  `status` VARCHAR(20) NOT NULL,
  `sent_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `refunded_paise` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_campaigns_order_unique` (`order_id`),
  KEY `whatsapp_campaigns_client_index` (`client_id`, `created_at`),
  KEY `whatsapp_campaigns_status_index` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per recipient. charge: free (counts against the monthly quota) | paid.
-- status: awaiting_payment → queued → sending → sent | failed; or cancelled (campaign expired).
-- A failed paid message is refunded to the wallet; a failed free one gives the quota back.
-- attempts: provider calls that failed temporarily (network, 5xx); retried up to 5 times.
CREATE TABLE IF NOT EXISTS `whatsapp_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id` BIGINT UNSIGNED NOT NULL,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `customer_id` BIGINT UNSIGNED NULL,
  `customer_name` VARCHAR(255) NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `body` TEXT NOT NULL,
  `charge` VARCHAR(10) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `provider_message_id` VARCHAR(191) NULL,
  `error` VARCHAR(255) NULL,
  `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `sent_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `whatsapp_messages_campaign_index` (`campaign_id`, `status`),
  KEY `whatsapp_messages_quota_index` (`client_id`, `charge`, `created_at`),
  KEY `whatsapp_messages_queue_index` (`status`, `id`),
  KEY `whatsapp_messages_provider_index` (`provider_message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet ledger. type: topup (+, Cashfree order_id) | send (-) | refund (+) | adjustment (super admin).
-- A Cashfree order credits the wallet once (unique client/type/order).
CREATE TABLE IF NOT EXISTS `whatsapp_wallet_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `amount_paise` BIGINT NOT NULL,
  `balance_after_paise` BIGINT UNSIGNED NOT NULL,
  `campaign_id` BIGINT UNSIGNED NULL,
  `order_id` VARCHAR(50) NULL,
  `note` VARCHAR(255) NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `whatsapp_wallet_order_unique` (`client_id`, `type`, `order_id`),
  KEY `whatsapp_wallet_client_index` (`client_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform default price per paid message (₹1.00). Super admin can change it.
INSERT IGNORE INTO `platform_settings` (`setting_key`, `setting_value`, `created_at`, `updated_at`)
VALUES ('whatsapp_price_paise', '100', NOW(), NOW());

-- Starter library. provider_template names must match templates approved at the provider.
INSERT IGNORE INTO `whatsapp_templates` (`id`, `name`, `category`, `body`, `provider_template`, `language`, `status`, `sort_order`, `created_at`, `updated_at`) VALUES
  (1, 'Thank you for shopping', 'utility', 'Hi {{customer_name}}, thank you for shopping at {{store_name}}! We hope to see you again soon.', 'zenxpos_thank_you', 'en', 1, 10, NOW(), NOW()),
  (2, 'Special offer', 'marketing', 'Hi {{customer_name}}, {{store_name}} has a special offer for you: {{offer_details}}. Valid till {{valid_till}}. Visit us today!', 'zenxpos_special_offer', 'en', 1, 20, NOW(), NOW()),
  (3, 'New arrivals', 'marketing', 'Hi {{customer_name}}, new arrivals are in at {{store_name}}! {{details}}. Drop by and take a look.', 'zenxpos_new_arrivals', 'en', 1, 30, NOW(), NOW()),
  (4, 'Festival wishes', 'marketing', 'Hi {{customer_name}}, {{store_name}} wishes you and your family a very happy {{festival}}! {{offer_details}}', 'zenxpos_festival_wishes', 'en', 1, 40, NOW(), NOW()),
  (5, 'Birthday wishes', 'marketing', 'Happy birthday {{customer_name}}! {{store_name}} wishes you a wonderful year ahead. {{offer_details}}', 'zenxpos_birthday_wishes', 'en', 1, 50, NOW(), NOW()),
  (6, 'Payment reminder', 'utility', 'Hi {{customer_name}}, this is a gentle reminder from {{store_name}} that Rs. {{amount}} is pending. Please clear it at your convenience. Thank you!', 'zenxpos_payment_reminder', 'en', 1, 60, NOW(), NOW());
