import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, type AppDb } from "../../../db/client.ts";
import { goals, type Goal } from "../../../db/schema.ts";
import { DEFAULT_ADMIN_USER_ID } from "../../access/services/auth-context.ts";

export type GoalType = "health" | "run";

export type GoalsRepositoryError = {
  code: "database_error";
  message: string;
};

export type GoalsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GoalsRepositoryError };

export type SaveHealthGoalInput = {
  targetWeightKg: number;
  targetWaistCm?: number | null;
  targetHipCm?: number | null;
  targetBodyFatPercentage?: number | null;
  nowIso: string;
};

export type SaveRunGoalInput = {
  weeklyRunCount: number;
  weeklyDistanceKm: number;
  nowIso: string;
};

function ok<T>(data: T): GoalsRepositoryResult<T> {
  return { ok: true, data };
}

function fail(): GoalsRepositoryResult<never> {
  return { ok: false, error: { code: "database_error", message: "目标数据操作失败" } };
}

export function createGoalsRepository(appDb: AppDb = getDb(), userId = DEFAULT_ADMIN_USER_ID) {
  return {
    getGoalByType(type: GoalType): GoalsRepositoryResult<Goal | null> {
      try {
        return ok(appDb.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.type, type))).get() ?? null);
      } catch {
        return fail();
      }
    },

    listGoals(): GoalsRepositoryResult<Goal[]> {
      try {
        return ok(appDb.select().from(goals).where(eq(goals.userId, userId)).all());
      } catch {
        return fail();
      }
    },

    saveHealthGoal(input: SaveHealthGoalInput): GoalsRepositoryResult<Goal> {
      try {
        const existing = appDb.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.type, "health"))).get();

        if (existing) {
          appDb
            .update(goals)
            .set({
              targetWeightKg: input.targetWeightKg,
              targetWaistCm: input.targetWaistCm ?? null,
              targetHipCm: input.targetHipCm ?? null,
              targetBodyFatPercentage: input.targetBodyFatPercentage ?? null,
              weeklyRunCount: null,
              weeklyDistanceKm: null,
              updatedAtIso: input.nowIso,
            })
            .where(eq(goals.id, existing.id))
            .run();

          return ok(appDb.select().from(goals).where(eq(goals.id, existing.id)).get()!);
        }

        const id = randomUUID();
        appDb
          .insert(goals)
          .values({
            id,
            userId,
            type: "health",
            targetWeightKg: input.targetWeightKg,
            targetWaistCm: input.targetWaistCm ?? null,
            targetHipCm: input.targetHipCm ?? null,
            targetBodyFatPercentage: input.targetBodyFatPercentage ?? null,
            weeklyRunCount: null,
            weeklyDistanceKm: null,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(goals).where(eq(goals.id, id)).get()!);
      } catch {
        return fail();
      }
    },

    saveRunGoal(input: SaveRunGoalInput): GoalsRepositoryResult<Goal> {
      try {
        const existing = appDb.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.type, "run"))).get();

        if (existing) {
          appDb
            .update(goals)
            .set({
              targetWeightKg: null,
              targetWaistCm: null,
              targetHipCm: null,
              targetBodyFatPercentage: null,
              weeklyRunCount: input.weeklyRunCount,
              weeklyDistanceKm: input.weeklyDistanceKm,
              updatedAtIso: input.nowIso,
            })
            .where(eq(goals.id, existing.id))
            .run();

          return ok(appDb.select().from(goals).where(eq(goals.id, existing.id)).get()!);
        }

        const id = randomUUID();
        appDb
          .insert(goals)
          .values({
            id,
            userId,
            type: "run",
            targetWeightKg: null,
            targetWaistCm: null,
            targetHipCm: null,
            targetBodyFatPercentage: null,
            weeklyRunCount: input.weeklyRunCount,
            weeklyDistanceKm: input.weeklyDistanceKm,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(goals).where(eq(goals.id, id)).get()!);
      } catch {
        return fail();
      }
    },
  };
}
