CREATE TABLE `health_records` (
	`id` text PRIMARY KEY NOT NULL,
	`local_date` text NOT NULL,
	`weight_kg` real,
	`waist_cm` real,
	`hip_cm` real,
	`body_fat_percentage` real,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `health_records_local_date_unique` ON `health_records` (`local_date`);--> statement-breakpoint
CREATE TABLE `run_records` (
	`id` text PRIMARY KEY NOT NULL,
	`local_date` text NOT NULL,
	`distance_km` real NOT NULL,
	`duration_seconds` integer,
	`pace_seconds_per_km` integer,
	`average_heart_rate_bpm` integer,
	`average_stride_meters` real,
	`cadence_spm` integer,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `run_records_local_date_idx` ON `run_records` (`local_date`);