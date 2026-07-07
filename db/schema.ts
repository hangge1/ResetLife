import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accessSecrets = sqliteTable(
  "access_secrets",
  {
    id: text("id").primaryKey().default("current"),
    passwordHash: text("password_hash").notNull(),
    passwordHashAlgorithm: text("password_hash_algorithm").notNull(),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
  },
  (table) => [check("access_secrets_singleton_id_check", sql`${table.id} = 'current'`)],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull(),
    passwordHash: text("password_hash").notNull(),
    passwordHashAlgorithm: text("password_hash_algorithm").notNull(),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
    disabledAtIso: text("disabled_at_iso"),
  },
  (table) => [
    uniqueIndex("users_username_unique").on(table.username),
    check("users_role_check", sql`${table.role} in ('admin', 'user')`),
  ],
);

export const userSessions = sqliteTable(
  "user_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    sessionTokenHash: text("session_token_hash").notNull(),
    createdAtIso: text("created_at_iso").notNull(),
    lastSeenAtIso: text("last_seen_at_iso").notNull(),
    expiresAtIso: text("expires_at_iso").notNull(),
    revokedAtIso: text("revoked_at_iso"),
  },
  (table) => [
    uniqueIndex("user_sessions_active_token_hash_unique")
      .on(table.sessionTokenHash)
      .where(sql`${table.revokedAtIso} is null`),
    index("user_sessions_user_id_idx").on(table.userId),
  ],
);

export const trustedDevices = sqliteTable(
  "trusted_devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("default-admin"),
    deviceIdentifierHash: text("device_identifier_hash").notNull(),
    displayName: text("display_name"),
    userAgent: text("user_agent"),
    createdAtIso: text("created_at_iso").notNull(),
    lastSeenAtIso: text("last_seen_at_iso").notNull(),
    revokedAtIso: text("revoked_at_iso"),
  },
  (table) => [
    uniqueIndex("trusted_devices_active_device_identifier_hash_unique")
      .on(table.userId, table.deviceIdentifierHash)
      .where(sql`${table.revokedAtIso} is null`),
  ],
);

export type AccessSecret = typeof accessSecrets.$inferSelect;
export type NewAccessSecret = typeof accessSecrets.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type TrustedDevice = typeof trustedDevices.$inferSelect;
export type NewTrustedDevice = typeof trustedDevices.$inferInsert;

export const healthRecords = sqliteTable(
  "health_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("default-admin"),
    localDate: text("local_date").notNull(),
    weightKg: real("weight_kg"),
    waistCm: real("waist_cm"),
    hipCm: real("hip_cm"),
    bodyFatPercentage: real("body_fat_percentage"),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
  },
  (table) => [uniqueIndex("health_records_user_local_date_unique").on(table.userId, table.localDate)],
);

export const runRecords = sqliteTable(
  "run_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("default-admin"),
    localDate: text("local_date").notNull(),
    distanceKm: real("distance_km").notNull(),
    durationSeconds: integer("duration_seconds"),
    paceSecondsPerKm: integer("pace_seconds_per_km"),
    averageHeartRateBpm: integer("average_heart_rate_bpm"),
    averageStrideMeters: real("average_stride_meters"),
    cadenceSpm: integer("cadence_spm"),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
  },
  (table) => [index("run_records_user_local_date_idx").on(table.userId, table.localDate)],
);

export type HealthRecord = typeof healthRecords.$inferSelect;
export type NewHealthRecord = typeof healthRecords.$inferInsert;
export type RunRecord = typeof runRecords.$inferSelect;
export type NewRunRecord = typeof runRecords.$inferInsert;

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("default-admin"),
    type: text("type").notNull(),
    targetWeightKg: real("target_weight_kg"),
    targetWaistCm: real("target_waist_cm"),
    targetHipCm: real("target_hip_cm"),
    targetBodyFatPercentage: real("target_body_fat_percentage"),
    weeklyRunCount: integer("weekly_run_count"),
    weeklyDistanceKm: real("weekly_distance_km"),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
  },
  (table) => [
    uniqueIndex("goals_user_type_unique").on(table.userId, table.type),
    check("goals_type_check", sql`${table.type} in ('health', 'run')`),
  ],
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export const settings = sqliteTable(
  "settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("default-admin"),
    type: text("type").notNull(),
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
  },
  (table) => [
    uniqueIndex("settings_user_type_key_unique").on(table.userId, table.type, table.key),
    check("settings_type_check", sql`${table.type} in ('profile', 'reminder', 'smtp', 'trend', 'access')`),
  ],
);

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export const reminderEvents = sqliteTable(
  "reminder_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("default-admin"),
    localDate: text("local_date").notNull(),
    reminderType: text("reminder_type").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull(),
    message: text("message").notNull(),
    createdAtIso: text("created_at_iso").notNull(),
    updatedAtIso: text("updated_at_iso").notNull(),
  },
  (table) => [
    uniqueIndex("reminder_events_user_idempotency_unique").on(
      table.userId,
      table.localDate,
      table.reminderType,
      table.channel,
    ),
    check("reminder_events_channel_check", sql`${table.channel} in ('in_app', 'email')`),
    check("reminder_events_status_check", sql`${table.status} in ('created', 'sent', 'failed', 'skipped')`),
  ],
);

export type ReminderEvent = typeof reminderEvents.$inferSelect;
export type NewReminderEvent = typeof reminderEvents.$inferInsert;
