-- Platform defaults inserted by the baselined migrations (integration providers, platform settings).


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

/*!40000 ALTER TABLE `integration_providers` DISABLE KEYS */;
INSERT INTO `integration_providers` (`id`, `code`, `name`, `category`, `description`, `credential_schema`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES (1,'pinelabs','Pine Labs','payment_gateway','Pine Labs online payment gateway','[{\"key\": \"clientId\", \"label\": \"Client ID\", \"secret\": false, \"required\": true}, {\"key\": \"clientSecret\", \"label\": \"Client Secret\", \"secret\": true, \"required\": true}, {\"key\": \"merchantId\", \"label\": \"Merchant ID\", \"secret\": false, \"required\": false}]',1,NULL,NULL,'2026-11-02 08:52:47','2026-11-02 08:52:47');
INSERT INTO `integration_providers` (`id`, `code`, `name`, `category`, `description`, `credential_schema`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES (2,'phonepe','PhonePe','payment_gateway','PhonePe payment gateway','[{\"key\": \"clientId\", \"label\": \"Client ID\", \"secret\": false, \"required\": true}, {\"key\": \"clientSecret\", \"label\": \"Client Secret\", \"secret\": true, \"required\": true}, {\"key\": \"clientVersion\", \"label\": \"Client Version\", \"secret\": false, \"required\": true}]',1,NULL,NULL,'2026-11-02 08:52:47','2026-11-02 08:52:47');
INSERT INTO `integration_providers` (`id`, `code`, `name`, `category`, `description`, `credential_schema`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES (3,'cashfree','Cashfree','payment_gateway','Cashfree payment gateway','[{\"key\": \"clientId\", \"label\": \"App ID\", \"secret\": false, \"required\": true}, {\"key\": \"clientSecret\", \"label\": \"Secret Key\", \"secret\": true, \"required\": true}]',1,NULL,NULL,'2026-11-02 08:52:47','2026-11-02 08:52:47');
/*!40000 ALTER TABLE `integration_providers` ENABLE KEYS */;

/*!40000 ALTER TABLE `platform_settings` DISABLE KEYS */;
INSERT INTO `platform_settings` (`id`, `setting_key`, `setting_value`, `updated_by`, `created_at`, `updated_at`) VALUES (1,'renewal_grace_days','7',NULL,'2026-11-02 08:52:47','2026-11-02 08:52:47');
INSERT INTO `platform_settings` (`id`, `setting_key`, `setting_value`, `updated_by`, `created_at`, `updated_at`) VALUES (2,'max_devices_per_user','1',NULL,'2026-11-02 08:52:47','2026-11-02 08:52:47');
/*!40000 ALTER TABLE `platform_settings` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

