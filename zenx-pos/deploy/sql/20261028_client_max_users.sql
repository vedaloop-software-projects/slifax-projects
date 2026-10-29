-- Number of active staff logins (client_users) a client may have, set by the
-- super admin when onboarding or editing the client. NULL means unlimited.
ALTER TABLE `users` ADD COLUMN `max_users` INT NULL;
