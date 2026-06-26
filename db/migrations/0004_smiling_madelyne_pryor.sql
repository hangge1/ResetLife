CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`target_weight_kg` real,
	`target_waist_cm` real,
	`target_hip_cm` real,
	`target_body_fat_percentage` real,
	`weekly_run_count` integer,
	`weekly_distance_km` real,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL,
	CONSTRAINT "goals_type_check" CHECK("goals"."type" in ('health', 'run'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goals_type_unique` ON `goals` (`type`);