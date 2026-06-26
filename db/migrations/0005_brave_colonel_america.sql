CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL,
	CONSTRAINT "settings_type_check" CHECK("settings"."type" in ('profile', 'reminder', 'smtp', 'trend', 'access'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_type_key_unique` ON `settings` (`type`,`key`);