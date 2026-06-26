DROP INDEX `trusted_devices_device_identifier_hash_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `trusted_devices_active_device_identifier_hash_unique` ON `trusted_devices` (`device_identifier_hash`) WHERE "trusted_devices"."revoked_at_iso" is null;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_access_secrets` (
	`id` text PRIMARY KEY DEFAULT 'current' NOT NULL,
	`password_hash` text NOT NULL,
	`password_hash_algorithm` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_access_secrets`("id", "password_hash", "password_hash_algorithm", "created_at_iso", "updated_at_iso") SELECT "id", "password_hash", "password_hash_algorithm", "created_at_iso", "updated_at_iso" FROM `access_secrets`;--> statement-breakpoint
DROP TABLE `access_secrets`;--> statement-breakpoint
ALTER TABLE `__new_access_secrets` RENAME TO `access_secrets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;