import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb, type AppDb } from "../../../db/client.ts";
import {
  healthRecords,
  type HealthRecord,
  type RunRecord,
  runRecords,
} from "../../../db/schema.ts";

type RepositoryErrorCode = "database_error";

export type RecordsRepositoryError = {
  code: RepositoryErrorCode;
  message: string;
};

export type RecordsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RecordsRepositoryError };

export type UpsertHealthRecordInput = {
  localDate: string;
  weightKg?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  bodyFatPercentage?: number | null;
  nowIso: string;
};

export type UpdateHealthRecordInput = {
  localDate?: string;
  weightKg?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  bodyFatPercentage?: number | null;
  updatedAtIso: string;
};

export type CreateRunRecordInput = {
  localDate: string;
  distanceKm: number;
  durationSeconds?: number | null;
  paceSecondsPerKm?: number | null;
  averageHeartRateBpm?: number | null;
  averageStrideMeters?: number | null;
  cadenceSpm?: number | null;
  nowIso: string;
};

export type UpdateRunRecordInput = {
  localDate?: string;
  distanceKm?: number;
  durationSeconds?: number | null;
  paceSecondsPerKm?: number | null;
  averageHeartRateBpm?: number | null;
  averageStrideMeters?: number | null;
  cadenceSpm?: number | null;
  updatedAtIso: string;
};

function ok<T>(data: T): RecordsRepositoryResult<T> {
  return { ok: true, data };
}

function fail(): RecordsRepositoryResult<never> {
  return { ok: false, error: { code: "database_error", message: "记录数据操作失败" } };
}

export function createRecordsRepository(appDb: AppDb = getDb()) {
  return {
    upsertHealthRecord(input: UpsertHealthRecordInput): RecordsRepositoryResult<HealthRecord> {
      try {
        const existing = appDb
          .select()
          .from(healthRecords)
          .where(eq(healthRecords.localDate, input.localDate))
          .get();

        if (existing) {
          appDb
            .update(healthRecords)
            .set({
              weightKg: input.weightKg ?? null,
              waistCm: input.waistCm ?? null,
              hipCm: input.hipCm ?? null,
              bodyFatPercentage: input.bodyFatPercentage ?? null,
              updatedAtIso: input.nowIso,
            })
            .where(eq(healthRecords.id, existing.id))
            .run();

          return ok(appDb.select().from(healthRecords).where(eq(healthRecords.id, existing.id)).get()!);
        }

        const id = randomUUID();
        appDb
          .insert(healthRecords)
          .values({
            id,
            localDate: input.localDate,
            weightKg: input.weightKg ?? null,
            waistCm: input.waistCm ?? null,
            hipCm: input.hipCm ?? null,
            bodyFatPercentage: input.bodyFatPercentage ?? null,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(healthRecords).where(eq(healthRecords.id, id)).get()!);
      } catch {
        return fail();
      }
    },

    getHealthRecordByDate(localDate: string): RecordsRepositoryResult<HealthRecord | null> {
      try {
        return ok(appDb.select().from(healthRecords).where(eq(healthRecords.localDate, localDate)).get() ?? null);
      } catch {
        return fail();
      }
    },

    listHealthRecords(): RecordsRepositoryResult<HealthRecord[]> {
      try {
        return ok(
          appDb
            .select()
            .from(healthRecords)
            .orderBy(desc(healthRecords.localDate), desc(healthRecords.createdAtIso))
            .all(),
        );
      } catch {
        return fail();
      }
    },

    updateHealthRecord(id: string, input: UpdateHealthRecordInput): RecordsRepositoryResult<HealthRecord | null> {
      try {
        appDb
          .update(healthRecords)
          .set({
            ...(input.localDate === undefined ? {} : { localDate: input.localDate }),
            ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
            ...(input.waistCm === undefined ? {} : { waistCm: input.waistCm }),
            ...(input.hipCm === undefined ? {} : { hipCm: input.hipCm }),
            ...(input.bodyFatPercentage === undefined ? {} : { bodyFatPercentage: input.bodyFatPercentage }),
            updatedAtIso: input.updatedAtIso,
          })
          .where(eq(healthRecords.id, id))
          .run();

        return ok(appDb.select().from(healthRecords).where(eq(healthRecords.id, id)).get() ?? null);
      } catch {
        return fail();
      }
    },

    deleteHealthRecord(id: string): RecordsRepositoryResult<HealthRecord | null> {
      try {
        const existing = appDb.select().from(healthRecords).where(eq(healthRecords.id, id)).get() ?? null;
        appDb.delete(healthRecords).where(eq(healthRecords.id, id)).run();
        return ok(existing);
      } catch {
        return fail();
      }
    },

    createRunRecord(input: CreateRunRecordInput): RecordsRepositoryResult<RunRecord> {
      try {
        const id = randomUUID();
        appDb
          .insert(runRecords)
          .values({
            id,
            localDate: input.localDate,
            distanceKm: input.distanceKm,
            durationSeconds: input.durationSeconds ?? null,
            paceSecondsPerKm: input.paceSecondsPerKm ?? null,
            averageHeartRateBpm: input.averageHeartRateBpm ?? null,
            averageStrideMeters: input.averageStrideMeters ?? null,
            cadenceSpm: input.cadenceSpm ?? null,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(runRecords).where(eq(runRecords.id, id)).get()!);
      } catch {
        return fail();
      }
    },

    getRunRecordById(id: string): RecordsRepositoryResult<RunRecord | null> {
      try {
        return ok(appDb.select().from(runRecords).where(eq(runRecords.id, id)).get() ?? null);
      } catch {
        return fail();
      }
    },

    listRunRecordsByDate(localDate: string): RecordsRepositoryResult<RunRecord[]> {
      try {
        return ok(
          appDb
            .select()
            .from(runRecords)
            .where(eq(runRecords.localDate, localDate))
            .orderBy(desc(runRecords.localDate), desc(runRecords.createdAtIso))
            .all(),
        );
      } catch {
        return fail();
      }
    },

    listRunRecords(): RecordsRepositoryResult<RunRecord[]> {
      try {
        return ok(
          appDb
            .select()
            .from(runRecords)
            .orderBy(desc(runRecords.localDate), desc(runRecords.createdAtIso))
            .all(),
        );
      } catch {
        return fail();
      }
    },

    updateRunRecord(id: string, input: UpdateRunRecordInput): RecordsRepositoryResult<RunRecord | null> {
      try {
        appDb
          .update(runRecords)
          .set({
            ...(input.localDate === undefined ? {} : { localDate: input.localDate }),
            ...(input.distanceKm === undefined ? {} : { distanceKm: input.distanceKm }),
            ...(input.durationSeconds === undefined ? {} : { durationSeconds: input.durationSeconds }),
            ...(input.paceSecondsPerKm === undefined ? {} : { paceSecondsPerKm: input.paceSecondsPerKm }),
            ...(input.averageHeartRateBpm === undefined ? {} : { averageHeartRateBpm: input.averageHeartRateBpm }),
            ...(input.averageStrideMeters === undefined ? {} : { averageStrideMeters: input.averageStrideMeters }),
            ...(input.cadenceSpm === undefined ? {} : { cadenceSpm: input.cadenceSpm }),
            updatedAtIso: input.updatedAtIso,
          })
          .where(eq(runRecords.id, id))
          .run();

        return ok(appDb.select().from(runRecords).where(eq(runRecords.id, id)).get() ?? null);
      } catch {
        return fail();
      }
    },

    deleteRunRecord(id: string): RecordsRepositoryResult<RunRecord | null> {
      try {
        const existing = appDb.select().from(runRecords).where(eq(runRecords.id, id)).get() ?? null;
        appDb.delete(runRecords).where(eq(runRecords.id, id)).run();
        return ok(existing);
      } catch {
        return fail();
      }
    },
  };
}
