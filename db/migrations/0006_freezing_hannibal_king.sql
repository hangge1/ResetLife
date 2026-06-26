CREATE TABLE `reminder_events` (
	`id` text PRIMARY KEY NOT NULL,
	`local_date` text NOT NULL,
	`reminder_type` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`message` text NOT NULL,
	`created_at_iso` text NOT NULL,
	`updated_at_iso` text NOT NULL,
	CONSTRAINT "reminder_events_channel_check" CHECK("reminder_events"."channel" in ('in_app', 'email')),
	CONSTRAINT "reminder_events_status_check" CHECK("reminder_events"."status" in ('created', 'sent', 'failed', 'skipped'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_events_idempotency_unique` ON `reminder_events` (`local_date`,`reminder_type`,`channel`);