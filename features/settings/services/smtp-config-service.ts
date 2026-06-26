import type { createSettingsRepository } from "../repositories/settings-repository.ts";
import type { SmtpSecureMode } from "./smtp-config-input.ts";
import { getSettingValue, saveSettingValue } from "./settings-service.ts";

type SettingsRepository = ReturnType<typeof createSettingsRepository>;

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  secureMode: SmtpSecureMode;
  passwordConfigured: boolean;
};

export type SmtpConfigSecret = SmtpConfig & {
  password: string;
};

export const emptySmtpConfig: SmtpConfig = {
  host: "",
  port: 465,
  username: "",
  fromEmail: "",
  secureMode: "ssl",
  passwordConfigured: false,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePublicConfig(value: unknown): SmtpConfig {
  if (!isObject(value)) {
    return emptySmtpConfig;
  }

  return {
    host: typeof value.host === "string" ? value.host : "",
    port: typeof value.port === "number" && Number.isInteger(value.port) ? value.port : 465,
    username: typeof value.username === "string" ? value.username : "",
    fromEmail: typeof value.fromEmail === "string" ? value.fromEmail : "",
    secureMode:
      value.secureMode === "none" || value.secureMode === "ssl" || value.secureMode === "starttls"
        ? value.secureMode
        : "ssl",
    passwordConfigured: typeof value.password === "string" && value.password.length > 0,
  };
}

function normalizeSecretConfig(value: unknown): SmtpConfigSecret | null {
  if (!isObject(value)) {
    return null;
  }

  const publicConfig = normalizePublicConfig(value);

  return {
    ...publicConfig,
    password: typeof value.password === "string" ? value.password : "",
  };
}

export function getSmtpConfig(repository: SettingsRepository) {
  const loaded = getSettingValue(repository, "smtp", "config");

  if (!loaded.ok) {
    return loaded;
  }

  return { ok: true as const, data: normalizePublicConfig(loaded.data) };
}

export function getSmtpConfigWithSecret(repository: SettingsRepository) {
  const loaded = getSettingValue(repository, "smtp", "config");

  if (!loaded.ok) {
    return loaded;
  }

  return { ok: true as const, data: normalizeSecretConfig(loaded.data) };
}

export function saveSmtpConfig(
  repository: SettingsRepository,
  input: {
    host: string;
    port: number;
    username: string;
    password: string;
    fromEmail: string;
    secureMode: SmtpSecureMode;
    nowIso: string;
  },
) {
  const existing = getSmtpConfigWithSecret(repository);
  if (!existing.ok) {
    return existing;
  }

  const saved = saveSettingValue(repository, {
    type: "smtp",
    key: "config",
    value: {
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password || existing.data?.password || "",
      fromEmail: input.fromEmail,
      secureMode: input.secureMode,
    },
    nowIso: input.nowIso,
  });

  if (!saved.ok) {
    return saved;
  }

  return { ok: true as const, data: normalizePublicConfig(saved.data) };
}

export function clearSmtpConfig(repository: SettingsRepository, nowIso: string) {
  return saveSettingValue(repository, {
    type: "smtp",
    key: "config",
    value: {
      host: "",
      port: 465,
      username: "",
      password: "",
      fromEmail: "",
      secureMode: "ssl",
    },
    nowIso,
  });
}
