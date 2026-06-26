CREATE TABLE `access_secrets` (
	`id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`password_hash_algorithm` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trusted_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`device_identifier_hash` text NOT NULL,
	`display_name` text,
	`user_agent` text,
	`created_at_iso` text NOT NULL,
	`last_seen_at_iso` text NOT NULL,
	`revoked_at_iso` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_devices_device_identifier_hash_unique` ON `trusted_devices` (`device_identifier_hash`);