import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, type AppDb } from "../../../db/client.ts";
import {
  accessSecrets,
  type AccessSecret,
  trustedDevices,
  type TrustedDevice,
} from "../../../db/schema.ts";

type RepositoryErrorCode = "duplicate_device" | "database_error";
const ACCESS_SECRET_ID = "current";

export type RepositoryError = {
  code: RepositoryErrorCode;
  message: string;
};

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RepositoryError };

type SaveAccessSecretInput = {
  passwordHash: string;
  passwordHashAlgorithm: string;
  nowIso: string;
};

type CreateTrustedDeviceInput = {
  deviceIdentifierHash: string;
  displayName?: string | null;
  userAgent?: string | null;
  nowIso: string;
};

type CreateInitialAccessInput = SaveAccessSecretInput & CreateTrustedDeviceInput;

function ok<T>(data: T): RepositoryResult<T> {
  return { ok: true, data };
}

function fail(error: RepositoryError): RepositoryResult<never> {
  return { ok: false, error };
}

function mapRepositoryError(error: unknown): RepositoryError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("UNIQUE") && message.includes("trusted_devices")) {
    return { code: "duplicate_device", message: "设备标识已存在" };
  }

  if (message.includes("UNIQUE") && message.includes("access_secrets")) {
    return { code: "database_error", message: "访问密码已经创建，请验证后访问" };
  }

  return { code: "database_error", message: "数据库操作失败" };
}

export function createAccessRepository(appDb: AppDb = getDb()) {
  return {
    getAccessSecret(): RepositoryResult<AccessSecret | null> {
      try {
        return ok(appDb.select().from(accessSecrets).where(eq(accessSecrets.id, ACCESS_SECRET_ID)).get() ?? null);
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    saveAccessSecret(input: SaveAccessSecretInput): RepositoryResult<AccessSecret> {
      try {
        const current = appDb
          .select()
          .from(accessSecrets)
          .where(eq(accessSecrets.id, ACCESS_SECRET_ID))
          .get();

        if (current) {
          appDb
            .update(accessSecrets)
            .set({
              passwordHash: input.passwordHash,
              passwordHashAlgorithm: input.passwordHashAlgorithm,
              updatedAtIso: input.nowIso,
            })
            .where(eq(accessSecrets.id, ACCESS_SECRET_ID))
            .run();

          return ok(appDb.select().from(accessSecrets).where(eq(accessSecrets.id, ACCESS_SECRET_ID)).get()!);
        }

        appDb
          .insert(accessSecrets)
          .values({
            id: ACCESS_SECRET_ID,
            passwordHash: input.passwordHash,
            passwordHashAlgorithm: input.passwordHashAlgorithm,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(accessSecrets).where(eq(accessSecrets.id, ACCESS_SECRET_ID)).get()!);
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    createInitialAccess(input: CreateInitialAccessInput): RepositoryResult<TrustedDevice> {
      try {
        const trustedDevice = appDb.transaction((tx) => {
          tx
            .insert(accessSecrets)
            .values({
              id: ACCESS_SECRET_ID,
              passwordHash: input.passwordHash,
              passwordHashAlgorithm: input.passwordHashAlgorithm,
              createdAtIso: input.nowIso,
              updatedAtIso: input.nowIso,
            })
            .run();

          const id = randomUUID();
          tx
            .insert(trustedDevices)
            .values({
              id,
              deviceIdentifierHash: input.deviceIdentifierHash,
              displayName: input.displayName ?? null,
              userAgent: input.userAgent ?? null,
              createdAtIso: input.nowIso,
              lastSeenAtIso: input.nowIso,
              revokedAtIso: null,
            })
            .run();

          return tx.select().from(trustedDevices).where(eq(trustedDevices.id, id)).get()!;
        });

        return ok(trustedDevice);
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    createTrustedDevice(input: CreateTrustedDeviceInput): RepositoryResult<TrustedDevice> {
      try {
        const revokedDevice = appDb
          .select()
          .from(trustedDevices)
          .where(
            and(
              eq(trustedDevices.deviceIdentifierHash, input.deviceIdentifierHash),
              isNull(trustedDevices.revokedAtIso),
            ),
          )
          .get();

        if (revokedDevice) {
          return fail({ code: "duplicate_device", message: "设备标识已存在" });
        }

        const existingRevokedDevice = appDb
          .select()
          .from(trustedDevices)
          .where(eq(trustedDevices.deviceIdentifierHash, input.deviceIdentifierHash))
          .get();

        if (existingRevokedDevice) {
          appDb
            .update(trustedDevices)
            .set({
              displayName: input.displayName ?? null,
              userAgent: input.userAgent ?? null,
              lastSeenAtIso: input.nowIso,
              revokedAtIso: null,
            })
            .where(eq(trustedDevices.id, existingRevokedDevice.id))
            .run();

          return ok(
            appDb.select().from(trustedDevices).where(eq(trustedDevices.id, existingRevokedDevice.id)).get()!,
          );
        }

        const id = randomUUID();
        appDb
          .insert(trustedDevices)
          .values({
            id,
            deviceIdentifierHash: input.deviceIdentifierHash,
            displayName: input.displayName ?? null,
            userAgent: input.userAgent ?? null,
            createdAtIso: input.nowIso,
            lastSeenAtIso: input.nowIso,
            revokedAtIso: null,
          })
          .run();

        return ok(appDb.select().from(trustedDevices).where(eq(trustedDevices.id, id)).get()!);
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    findTrustedDeviceByHash(deviceIdentifierHash: string): RepositoryResult<TrustedDevice | null> {
      try {
        return ok(
          appDb
            .select()
            .from(trustedDevices)
            .where(
              and(eq(trustedDevices.deviceIdentifierHash, deviceIdentifierHash), isNull(trustedDevices.revokedAtIso)),
            )
            .get() ?? null,
        );
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    touchTrustedDevice(id: string, lastSeenAtIso: string): RepositoryResult<TrustedDevice | null> {
      try {
        appDb
          .update(trustedDevices)
          .set({ lastSeenAtIso })
          .where(and(eq(trustedDevices.id, id), isNull(trustedDevices.revokedAtIso)))
          .run();

        return ok(
          appDb
            .select()
            .from(trustedDevices)
            .where(and(eq(trustedDevices.id, id), isNull(trustedDevices.revokedAtIso)))
            .get() ?? null,
        );
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    listTrustedDevices(): RepositoryResult<TrustedDevice[]> {
      try {
        return ok(
          appDb
            .select()
            .from(trustedDevices)
            .where(isNull(trustedDevices.revokedAtIso))
            .orderBy(desc(trustedDevices.lastSeenAtIso))
            .all(),
        );
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },

    revokeTrustedDevice(id: string, revokedAtIso: string): RepositoryResult<TrustedDevice | null> {
      try {
        appDb
          .update(trustedDevices)
          .set({ revokedAtIso })
          .where(eq(trustedDevices.id, id))
          .run();

        return ok(appDb.select().from(trustedDevices).where(eq(trustedDevices.id, id)).get() ?? null);
      } catch (error) {
        return fail(mapRepositoryError(error));
      }
    },
  };
}
