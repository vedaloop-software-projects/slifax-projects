DROP INDEX `tenant_integration_requests_provider_index` ON `tenant_integration_requests`;
DROP INDEX `tenant_integrations_provider_index` ON `tenant_integrations`;
ALTER TABLE `support_incidents` MODIFY `signature` VARCHAR(64) NULL;
DROP TABLE `zenxpos_schema_migrations`;
