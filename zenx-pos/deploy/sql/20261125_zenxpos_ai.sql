-- ZenxPOS AI: a daily credit allowance per store and a log of what used it.
--
-- users.ai_daily_credits: credits the store gets each business day (store time zone).
-- 0 turns ZenxPOS AI off for the store.
-- ai_usage: one row per charged run. A repeat of the same run (same feature and input)
-- on the same business day is not charged again, which the unique key enforces.
SET @ai_credits_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'ai_daily_credits');
SET @ai_credits_ddl = IF(@ai_credits_exists = 0, 'ALTER TABLE `users` ADD COLUMN `ai_daily_credits` INT UNSIGNED NOT NULL DEFAULT 50', 'SELECT 1');
PREPARE ai_credits_statement FROM @ai_credits_ddl;
EXECUTE ai_credits_statement;
DEALLOCATE PREPARE ai_credits_statement;

CREATE TABLE IF NOT EXISTS `ai_usage` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` BIGINT UNSIGNED NOT NULL,
  `usage_date` DATE NOT NULL,
  `feature` VARCHAR(40) NOT NULL,
  `input_key` VARCHAR(64) NOT NULL,
  `credits` INT UNSIGNED NOT NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ai_usage_unique` (`client_id`, `usage_date`, `feature`, `input_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
