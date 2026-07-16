package sqlite

import (
	"context"
	"database/sql"
	"fmt"
)

func Migrate(ctx context.Context, db *sql.DB) error {
	for _, statement := range migrationStatements {
		if _, err := db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("apply migration: %w", err)
		}
	}

	return nil
}

var migrationStatements = []string{
	`CREATE TABLE IF NOT EXISTS users (
		id text PRIMARY KEY NOT NULL,
		username text NOT NULL,
		display_name text,
		role text NOT NULL,
		password_hash text NOT NULL,
		password_hash_algorithm text NOT NULL,
		created_at_iso text NOT NULL,
		updated_at_iso text NOT NULL,
		disabled_at_iso text,
		CONSTRAINT users_role_check CHECK (role in ('admin', 'user'))
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`,
	`CREATE TABLE IF NOT EXISTS user_sessions (
		id text PRIMARY KEY NOT NULL,
		user_id text NOT NULL,
		session_token_hash text NOT NULL,
		created_at_iso text NOT NULL,
		last_seen_at_iso text NOT NULL,
		expires_at_iso text NOT NULL,
		revoked_at_iso text
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_active_token_hash_unique
		ON user_sessions (session_token_hash)
		WHERE revoked_at_iso is null`,
	`CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id)`,
	`CREATE TABLE IF NOT EXISTS health_records (
		id text PRIMARY KEY NOT NULL,
		user_id text NOT NULL DEFAULT 'default-admin',
		local_date text NOT NULL,
		weight_kg real,
		waist_cm real,
		hip_cm real,
		body_fat_percentage real,
		created_at_iso text NOT NULL,
		updated_at_iso text NOT NULL
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS health_records_user_local_date_unique
		ON health_records (user_id, local_date)`,
	`CREATE TABLE IF NOT EXISTS run_records (
		id text PRIMARY KEY NOT NULL,
		user_id text NOT NULL DEFAULT 'default-admin',
		local_date text NOT NULL,
		distance_km real NOT NULL,
		duration_seconds integer,
		pace_seconds_per_km integer,
		average_heart_rate_bpm integer,
		average_stride_meters real,
		cadence_spm integer,
		created_at_iso text NOT NULL,
		updated_at_iso text NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS run_records_user_local_date_idx
		ON run_records (user_id, local_date)`,
	`CREATE TABLE IF NOT EXISTS goals (
		id text PRIMARY KEY NOT NULL,
		user_id text NOT NULL DEFAULT 'default-admin',
		type text NOT NULL,
		target_weight_kg real,
		target_waist_cm real,
		target_hip_cm real,
		target_body_fat_percentage real,
		weekly_run_count integer,
		weekly_distance_km real,
		created_at_iso text NOT NULL,
		updated_at_iso text NOT NULL,
		CONSTRAINT goals_type_check CHECK (type in ('health', 'run'))
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS goals_user_type_unique
		ON goals (user_id, type)`,
	`CREATE TABLE IF NOT EXISTS settings (
		id text PRIMARY KEY NOT NULL,
		user_id text NOT NULL DEFAULT 'default-admin',
		type text NOT NULL,
		key text NOT NULL,
		value_json text NOT NULL,
		created_at_iso text NOT NULL,
		updated_at_iso text NOT NULL,
		CONSTRAINT settings_type_check CHECK (type in ('profile', 'reminder', 'smtp', 'trend', 'access'))
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS settings_user_type_key_unique
		ON settings (user_id, type, key)`,
	`CREATE TABLE IF NOT EXISTS reminder_events (
		id text PRIMARY KEY NOT NULL,
		user_id text NOT NULL DEFAULT 'default-admin',
		local_date text NOT NULL,
		reminder_type text NOT NULL,
		channel text NOT NULL,
		status text NOT NULL,
		message text NOT NULL,
		created_at_iso text NOT NULL,
		updated_at_iso text NOT NULL,
		CONSTRAINT reminder_events_channel_check CHECK (channel in ('in_app', 'email')),
		CONSTRAINT reminder_events_status_check CHECK (status in ('created', 'sent', 'failed', 'skipped'))
	)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS reminder_events_user_idempotency_unique
		ON reminder_events (user_id, local_date, reminder_type, channel)`,
}
