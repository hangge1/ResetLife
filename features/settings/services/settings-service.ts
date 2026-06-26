import type { SettingType, createSettingsRepository } from "../repositories/settings-repository.ts";

type SettingsRepository = ReturnType<typeof createSettingsRepository>;

type SettingsFieldErrors = {
  type?: string;
  key?: string;
  value?: string;
  form?: string;
};

type SettingsServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: SettingsFieldErrors };

function validateType(type: string): type is SettingType {
  return ["profile", "reminder", "smtp", "trend", "access"].includes(type);
}

function validateKey(key: string) {
  return /^[a-z][a-z0-9_-]*$/.test(key);
}

function safeParseJson(valueJson: string) {
  try {
    return { ok: true as const, data: JSON.parse(valueJson) as unknown };
  } catch {
    return { ok: false as const };
  }
}

export function saveSettingValue(
  repository: SettingsRepository,
  input: {
    type: SettingType;
    key: string;
    value: unknown;
    nowIso: string;
  },
): SettingsServiceResult<unknown> {
  const fieldErrors: SettingsFieldErrors = {};

  if (!validateType(input.type)) {
    fieldErrors.type = "设置类型无效";
  }

  if (!validateKey(input.key)) {
    fieldErrors.key = "设置键名只能使用小写字母、数字、短横线和下划线";
  }

  let valueJson = "";
  try {
    valueJson = JSON.stringify(input.value);
  } catch {
    fieldErrors.value = "设置内容必须可以保存为 JSON";
  }

  if (valueJson === undefined) {
    fieldErrors.value = "设置内容必须可以保存为 JSON";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const saved = repository.saveSetting({
    type: input.type,
    key: input.key,
    valueJson,
    nowIso: input.nowIso,
  });

  if (!saved.ok) {
    return { ok: false, fieldErrors: { form: saved.error.message } };
  }

  const parsed = safeParseJson(saved.data.valueJson);
  if (!parsed.ok) {
    return { ok: false, fieldErrors: { form: "设置内容读取失败" } };
  }

  return { ok: true, data: parsed.data };
}

export function getSettingValue(
  repository: SettingsRepository,
  type: SettingType,
  key: string,
): SettingsServiceResult<unknown | null> {
  if (!validateType(type)) {
    return { ok: false, fieldErrors: { type: "设置类型无效" } };
  }

  if (!validateKey(key)) {
    return { ok: false, fieldErrors: { key: "设置键名只能使用小写字母、数字、短横线和下划线" } };
  }

  const setting = repository.getSetting(type, key);
  if (!setting.ok) {
    return { ok: false, fieldErrors: { form: setting.error.message } };
  }

  if (!setting.data) {
    return { ok: true, data: null };
  }

  const parsed = safeParseJson(setting.data.valueJson);
  if (!parsed.ok) {
    return { ok: false, fieldErrors: { form: "设置内容读取失败" } };
  }

  return { ok: true, data: parsed.data };
}
