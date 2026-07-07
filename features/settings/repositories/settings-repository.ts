import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, type AppDb } from "../../../db/client.ts";
import { settings, type Setting } from "../../../db/schema.ts";
import { DEFAULT_ADMIN_USER_ID } from "../../access/services/auth-context.ts";

export type SettingType = "profile" | "reminder" | "smtp" | "trend" | "access";

export type SettingsRepositoryError = {
  code: "database_error";
  message: string;
};

export type SettingsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SettingsRepositoryError };

export type SaveSettingInput = {
  type: SettingType;
  key: string;
  valueJson: string;
  nowIso: string;
};

function ok<T>(data: T): SettingsRepositoryResult<T> {
  return { ok: true, data };
}

function fail(): SettingsRepositoryResult<never> {
  return { ok: false, error: { code: "database_error", message: "设置数据操作失败" } };
}

function settingWhere(userId: string, type: SettingType, key: string) {
  return and(eq(settings.userId, userId), eq(settings.type, type), eq(settings.key, key));
}

export function createSettingsRepository(appDb: AppDb = getDb(), userId = DEFAULT_ADMIN_USER_ID) {
  return {
    getSetting(type: SettingType, key: string): SettingsRepositoryResult<Setting | null> {
      try {
        return ok(appDb.select().from(settings).where(settingWhere(userId, type, key)).get() ?? null);
      } catch {
        return fail();
      }
    },

    listSettingsByType(type: SettingType): SettingsRepositoryResult<Setting[]> {
      try {
        return ok(appDb.select().from(settings).where(and(eq(settings.userId, userId), eq(settings.type, type))).all());
      } catch {
        return fail();
      }
    },

    saveSetting(input: SaveSettingInput): SettingsRepositoryResult<Setting> {
      try {
        const existing = appDb.select().from(settings).where(settingWhere(userId, input.type, input.key)).get();

        if (existing) {
          appDb
            .update(settings)
            .set({
              valueJson: input.valueJson,
              updatedAtIso: input.nowIso,
            })
            .where(eq(settings.id, existing.id))
            .run();

          return ok(appDb.select().from(settings).where(eq(settings.id, existing.id)).get()!);
        }

        const id = randomUUID();
        appDb
          .insert(settings)
          .values({
            id,
            userId,
            type: input.type,
            key: input.key,
            valueJson: input.valueJson,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(settings).where(eq(settings.id, id)).get()!);
      } catch {
        return fail();
      }
    },
  };
}
