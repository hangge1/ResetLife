import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, type AppDb } from "../../../db/client.ts";
import { reminderEvents, type ReminderEvent } from "../../../db/schema.ts";
import { DEFAULT_ADMIN_USER_ID } from "../../access/services/auth-context.ts";

export type ReminderChannel = "in_app" | "email";
export type ReminderStatus = "created" | "sent" | "failed" | "skipped";

export type ReminderRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: "database_error"; message: string } };

type CreateReminderEventInput = {
  localDate: string;
  reminderType: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  message: string;
  nowIso: string;
};

type UpdateReminderEventStatusInput = {
  id: string;
  status: ReminderStatus;
  message: string;
  nowIso: string;
};

function ok<T>(data: T): ReminderRepositoryResult<T> {
  return { ok: true, data };
}

function fail(): ReminderRepositoryResult<never> {
  return { ok: false, error: { code: "database_error", message: "提醒数据操作失败" } };
}

function eventWhere(userId: string, localDate: string, reminderType: string, channel: ReminderChannel) {
  return and(
    eq(reminderEvents.userId, userId),
    eq(reminderEvents.localDate, localDate),
    eq(reminderEvents.reminderType, reminderType),
    eq(reminderEvents.channel, channel),
  );
}

export function createReminderRepository(appDb: AppDb = getDb(), userId = DEFAULT_ADMIN_USER_ID) {
  return {
    getReminderEvent(
      localDate: string,
      reminderType: string,
      channel: ReminderChannel,
    ): ReminderRepositoryResult<ReminderEvent | null> {
      try {
        return ok(
          appDb
            .select()
            .from(reminderEvents)
            .where(eventWhere(userId, localDate, reminderType, channel))
            .get() ?? null,
        );
      } catch {
        return fail();
      }
    },

    getLatestEmailReminderEvent(): ReminderRepositoryResult<ReminderEvent | null> {
      try {
        return ok(
          appDb
            .select()
            .from(reminderEvents)
            .where(and(eq(reminderEvents.userId, userId), eq(reminderEvents.channel, "email")))
            .orderBy(desc(reminderEvents.updatedAtIso))
            .get() ?? null,
        );
      } catch {
        return fail();
      }
    },

    deleteReminderEvent(
      localDate: string,
      reminderType: string,
      channel: ReminderChannel,
    ): ReminderRepositoryResult<void> {
      try {
        appDb.delete(reminderEvents).where(eventWhere(userId, localDate, reminderType, channel)).run();
        return ok(undefined);
      } catch {
        return fail();
      }
    },

    deleteReminderEventsForDateChannel(localDate: string, channel: ReminderChannel): ReminderRepositoryResult<void> {
      try {
        appDb
          .delete(reminderEvents)
          .where(
            and(
              eq(reminderEvents.userId, userId),
              eq(reminderEvents.localDate, localDate),
              eq(reminderEvents.channel, channel),
            ),
          )
          .run();
        return ok(undefined);
      } catch {
        return fail();
      }
    },

    createReminderEvent(input: CreateReminderEventInput): ReminderRepositoryResult<ReminderEvent> {
      try {
        const existing = appDb
          .select()
          .from(reminderEvents)
          .where(eventWhere(userId, input.localDate, input.reminderType, input.channel))
          .get();

        if (existing) {
          return ok(existing);
        }

        const id = randomUUID();
        appDb
          .insert(reminderEvents)
          .values({
            id,
            userId,
            localDate: input.localDate,
            reminderType: input.reminderType,
            channel: input.channel,
            status: input.status,
            message: input.message,
            createdAtIso: input.nowIso,
            updatedAtIso: input.nowIso,
          })
          .run();

        return ok(appDb.select().from(reminderEvents).where(eq(reminderEvents.id, id)).get()!);
      } catch {
        return fail();
      }
    },

    updateReminderEventStatus(input: UpdateReminderEventStatusInput): ReminderRepositoryResult<ReminderEvent | null> {
      try {
        appDb
          .update(reminderEvents)
          .set({
            status: input.status,
            message: input.message,
            updatedAtIso: input.nowIso,
          })
          .where(and(eq(reminderEvents.userId, userId), eq(reminderEvents.id, input.id)))
          .run();

        return ok(
          appDb
            .select()
            .from(reminderEvents)
            .where(and(eq(reminderEvents.userId, userId), eq(reminderEvents.id, input.id)))
            .get() ?? null,
        );
      } catch {
        return fail();
      }
    },
  };
}
