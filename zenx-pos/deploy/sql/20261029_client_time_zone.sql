-- IANA timezone of the client's store (for example Asia/Kolkata). Business days,
-- subscription dates and report periods are calculated in it, using the server
-- clock. Set from the device at sign-in and refreshed when a new device signs in.
-- NULL means Asia/Kolkata. Safe to rerun on MySQL 8.0+.
SET @client_time_zone_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'time_zone'
);
SET @client_time_zone_ddl = IF(
  @client_time_zone_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `time_zone` VARCHAR(64) NULL',
  'SELECT 1'
);
PREPARE client_time_zone_statement FROM @client_time_zone_ddl;
EXECUTE client_time_zone_statement;
DEALLOCATE PREPARE client_time_zone_statement;
