CREATE TABLE `user_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token_hash` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`last_seen_at_iso` text NOT NULL,
	`expires_at_iso` text NOT NULL,
	`revoked_at_iso` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_sessions_active_token_hash_unique` ON `user_sessions` (`session_token_hash`) WHERE "user_sessions"."revoked_at_iso" is null;--> statement-breakpoint
CREATE INDEX `user_sessions_user_id_idx` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`role` text NOT NULL,
	`password_hash` text NOT NULL,
	`password_hash_algorithm` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL,
	`disabled_at_iso` text,
	CONSTRAINT "users_role_check" CHECK("users"."role" in ('admin', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
INSERT OR IGNORE INTO `users` (
	`id`,
	`username`,
	`display_name`,
	`role`,
	`password_hash`,
	`password_hash_algorithm`,
	`created_at_iso`,
	`updated_at_iso`,
	`disabled_at_iso`
)
SELECT
	'default-admin',
	'admin',
	'管理员',
	'admin',
	`password_hash`,
	`password_hash_algorithm`,
	`created_at_iso`,
	`updated_at_iso`,
	NULL
FROM `access_secrets`
WHERE `id` = 'current';--> statement-breakpoint
DROP INDEX `goals_type_unique`;--> statement-breakpoint
ALTER TABLE `goals` ADD `user_id` text DEFAULT 'default-admin' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `goals_user_type_unique` ON `goals` (`user_id`,`type`);--> statement-breakpoint
DROP INDEX `health_records_local_date_unique`;--> statement-breakpoint
ALTER TABLE `health_records` ADD `user_id` text DEFAULT 'default-admin' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `health_records_user_local_date_unique` ON `health_records` (`user_id`,`local_date`);--> statement-breakpoint
DROP INDEX `reminder_events_idempotency_unique`;--> statement-breakpoint
ALTER TABLE `reminder_events` ADD `user_id` text DEFAULT 'default-admin' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_events_user_idempotency_unique` ON `reminder_events` (`user_id`,`local_date`,`reminder_type`,`channel`);--> statement-breakpoint
DROP INDEX `run_records_local_date_idx`;--> statement-breakpoint
ALTER TABLE `run_records` ADD `user_id` text DEFAULT 'default-admin' NOT NULL;--> statement-breakpoint
CREATE INDEX `run_records_user_local_date_idx` ON `run_records` (`user_id`,`local_date`);--> statement-breakpoint
DROP INDEX `settings_type_key_unique`;--> statement-breakpoint
ALTER TABLE `settings` ADD `user_id` text DEFAULT 'default-admin' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `settings_user_type_key_unique` ON `settings` (`user_id`,`type`,`key`);--> statement-breakpoint
DROP INDEX `trusted_devices_active_device_identifier_hash_unique`;--> statement-breakpoint
ALTER TABLE `trusted_devices` ADD `user_id` text DEFAULT 'default-admin' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_devices_active_device_identifier_hash_unique` ON `trusted_devices` (`user_id`,`device_identifier_hash`) WHERE "trusted_devices"."revoked_at_iso" is null;
