import type { createSettingsRepository } from "../repositories/settings-repository.ts";
import { getSettingValue, saveSettingValue } from "./settings-service.ts";

type SettingsRepository = ReturnType<typeof createSettingsRepository>;

export type ProfileSettings = {
  nickname: string;
  heightCm: number | null;
  reminderEmail: string;
};

const emptyProfileSettings: ProfileSettings = {
  nickname: "",
  heightCm: null,
  reminderEmail: "",
};

function normalizeProfileSettings(value: unknown): ProfileSettings {
  if (!value || typeof value !== "object") {
    return emptyProfileSettings;
  }

  const record = value as Partial<ProfileSettings>;

  return {
    nickname: typeof record.nickname === "string" ? record.nickname : "",
    heightCm: typeof record.heightCm === "number" && Number.isFinite(record.heightCm) ? record.heightCm : null,
    reminderEmail: typeof record.reminderEmail === "string" ? record.reminderEmail : "",
  };
}

export function getProfileSettings(repository: SettingsRepository) {
  const loaded = getSettingValue(repository, "profile", "basic");

  if (!loaded.ok) {
    return loaded;
  }

  return {
    ok: true as const,
    data: normalizeProfileSettings(loaded.data),
  };
}

export function saveProfileSettings(
  repository: SettingsRepository,
  input: ProfileSettings & { nowIso: string },
) {
  const saved = saveSettingValue(repository, {
    type: "profile",
    key: "basic",
    value: {
      nickname: input.nickname,
      heightCm: input.heightCm,
      reminderEmail: input.reminderEmail,
    },
    nowIso: input.nowIso,
  });

  if (!saved.ok) {
    return saved;
  }

  return {
    ok: true as const,
    data: normalizeProfileSettings(saved.data),
  };
}
