import { getDb } from "@/db/client";
import { createGoalsRepository } from "@/features/goals/repositories/goals-repository";
import { createGuestGoalsRepository, createGuestRecordsRepository } from "@/features/guest/repositories/guest-repositories";
import { createRecordsRepository } from "@/features/records/repositories/records-repository";
import { createReminderRepository } from "@/features/reminders/repositories/reminder-repository";
import { createSettingsRepository } from "@/features/settings/repositories/settings-repository";
import { DEFAULT_ADMIN_USER_ID, type AuthContext } from "./auth-context";

export function createRecordsRepositoryForAuth(auth: AuthContext) {
  if (auth.mode === "guest") {
    return createGuestRecordsRepository(auth.guestSessionId);
  }

  return createRecordsRepository(getDb(), auth.userId);
}

export function createGoalsRepositoryForAuth(auth: AuthContext) {
  if (auth.mode === "guest") {
    return createGuestGoalsRepository(auth.guestSessionId);
  }

  return createGoalsRepository(getDb(), auth.userId);
}

export function createSettingsRepositoryForAuth(auth: AuthContext) {
  if (auth.mode === "guest") {
    return createSettingsRepository(getDb(), "__guest_settings_disabled__");
  }

  return createSettingsRepository(getDb(), auth.userId);
}

export function createGlobalSettingsRepository() {
  return createSettingsRepository(getDb(), DEFAULT_ADMIN_USER_ID);
}

export function createReminderRepositoryForAuth(auth: AuthContext) {
  if (auth.mode === "guest") {
    return createReminderRepository(getDb(), "__guest_reminders_disabled__");
  }

  return createReminderRepository(getDb(), auth.userId);
}
