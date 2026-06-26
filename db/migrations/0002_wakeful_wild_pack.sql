PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_access_secrets` (
	`id` text PRIMARY KEY DEFAULT 'current' NOT NULL,
	`password_hash` text NOT NULL,
	`password_hash_algorithm` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL,
	CONSTRAINT "access_secrets_singleton_id_check" CHECK("__new_access_secrets"."id" = 'current')
);
--> statement-breakpoint
INSERT INTO `__new_access_secrets`("id", "password_hash", "password_hash_algorithm", "created_at_iso", "updated_at_iso") SELECT 'current', "password_hash", "password_hash_algorithm", "created_at_iso", "updated_at_iso" FROM `access_secrets` LIMIT 1;--> statement-breakpoint
DROP TABLE `access_secrets`;--> statement-breakpoint
ALTER TABLE `__new_access_secrets` RENAME TO `access_secrets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
