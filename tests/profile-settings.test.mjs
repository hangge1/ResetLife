import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createSettingsRepository } from "../features/settings/repositories/settings-repository.ts";
import { parseProfileFormValues } from "../features/settings/services/profile-input.ts";
import { getProfileSettings, saveProfileSettings } from "../features/settings/services/profile-settings-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-profile-"));
  const sqlitePath = join(dir, "test.sqlite");
  const sqlite = new Database(sqlitePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "./db/migrations" });

  return {
    repository: createSettingsRepository(db),
    cleanup() {
      sqlite.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("个人资料输入解析会校验身高和邮箱并保留原始输入", () => {
  const values = {
    nickname: "hangge",
    heightCm: "0",
    reminderEmail: "bad-email",
  };
  const parsed = parseProfileFormValues(values);

  assert.equal(parsed.ok, false);
  assert.deepEqual(parsed.values, values);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.heightCm, "身高必须是大于 0 的数字");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.reminderEmail, "邮箱格式不正确");
});

test("个人资料输入解析允许空昵称、空身高和空邮箱", () => {
  const parsed = parseProfileFormValues({
    nickname: "",
    heightCm: "",
    reminderEmail: "",
  });

  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.ok ? parsed.data : {}, {
    nickname: "",
    heightCm: null,
    reminderEmail: "",
  });
});

test("个人资料设置可以保存并读取", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const saved = saveProfileSettings(repository, {
      nickname: "hangge",
      heightCm: 175,
      reminderEmail: "me@example.com",
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    const loaded = getProfileSettings(repository);

    assert.equal(saved.ok, true);
    assert.equal(loaded.ok, true);
    assert.deepEqual(loaded.ok ? loaded.data : null, {
      nickname: "hangge",
      heightCm: 175,
      reminderEmail: "me@example.com",
    });
  } finally {
    cleanup();
  }
});
