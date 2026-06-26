import type { createSettingsRepository } from "../repositories/settings-repository.ts";
import { getSettingValue, saveSettingValue } from "./settings-service.ts";

type SettingsRepository = ReturnType<typeof createSettingsRepository>;

export type ReminderRuleSettings = {
  reminderTime: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export const defaultReminderRuleSettings: ReminderRuleSettings = {
  reminderTime: "20:30",
  inAppEnabled: false,
  emailEnabled: false,
};

function normalizeReminderRuleSettings(value: unknown): ReminderRuleSettings {
  if (!value || typeof value !== "object") {
    return defaultReminderRuleSettings;
  }

  const record = value as Partial<ReminderRuleSettings>;

  return {
    reminderTime: typeof record.reminderTime === "string" ? record.reminderTime : defaultReminderRuleSettings.reminderTime,
    inAppEnabled: typeof record.inAppEnabled === "boolean" ? record.inAppEnabled : false,
    emailEnabled: typeof record.emailEnabled === "boolean" ? record.emailEnabled : false,
  };
}

export function getReminderRuleSettings(repository: SettingsRepository) {
  const loaded = getSettingValue(repository, "reminder", "rules");

  if (!loaded.ok) {
    return loaded;
  }

  return {
    ok: true as const,
    data: normalizeReminderRuleSettings(loaded.data),
  };
}

export function saveReminderRuleSettings(
  repository: SettingsRepository,
  input: ReminderRuleSettings & { nowIso: string },
) {
  const saved = saveSettingValue(repository, {
    type: "reminder",
    key: "rules",
    value: {
      reminderTime: input.reminderTime,
      inAppEnabled: input.inAppEnabled,
      emailEnabled: input.emailEnabled,
    },
    nowIso: input.nowIso,
  });

  if (!saved.ok) {
    return saved;
  }

  return {
    ok: true as const,
    data: normalizeReminderRuleSettings(saved.data),
  };
}
