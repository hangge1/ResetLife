import type { createSettingsRepository } from "../repositories/settings-repository.ts";
import { getSettingValue, saveSettingValue } from "./settings-service.ts";

type SettingsRepository = ReturnType<typeof createSettingsRepository>;

export type TrendThresholdSettings = {
  minimumDays: number;
  minimumRecords: number;
};

export const defaultTrendThresholdSettings: TrendThresholdSettings = {
  minimumDays: 7,
  minimumRecords: 3,
};

function normalizeTrendThresholdSettings(value: unknown): TrendThresholdSettings {
  if (!value || typeof value !== "object") {
    return defaultTrendThresholdSettings;
  }

  const record = value as Partial<TrendThresholdSettings>;
  const minimumDays =
    typeof record.minimumDays === "number" && Number.isInteger(record.minimumDays) && record.minimumDays >= 7
      ? record.minimumDays
      : defaultTrendThresholdSettings.minimumDays;
  const minimumRecords =
    typeof record.minimumRecords === "number" && Number.isInteger(record.minimumRecords) && record.minimumRecords >= 3
      ? record.minimumRecords
      : defaultTrendThresholdSettings.minimumRecords;

  return { minimumDays, minimumRecords };
}

export function getTrendThresholdSettings(repository: SettingsRepository) {
  const loaded = getSettingValue(repository, "trend", "estimation-thresholds");

  if (!loaded.ok) {
    return loaded;
  }

  return {
    ok: true as const,
    data: normalizeTrendThresholdSettings(loaded.data),
  };
}

export function saveTrendThresholdSettings(
  repository: SettingsRepository,
  input: TrendThresholdSettings & { nowIso: string },
) {
  if (input.minimumDays < 7) {
    return { ok: false as const, fieldErrors: { minimumDays: "最低统计天数不能低于 7 天" } };
  }

  if (input.minimumRecords < 3) {
    return { ok: false as const, fieldErrors: { minimumRecords: "最低有效记录数不能低于 3 条" } };
  }

  const saved = saveSettingValue(repository, {
    type: "trend",
    key: "estimation-thresholds",
    value: {
      minimumDays: input.minimumDays,
      minimumRecords: input.minimumRecords,
    },
    nowIso: input.nowIso,
  });

  if (!saved.ok) {
    return saved;
  }

  return {
    ok: true as const,
    data: normalizeTrendThresholdSettings(saved.data),
  };
}
