import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createSettingsRepository } from "../features/settings/repositories/settings-repository.ts";
import { parseSmtpConfigFormValues } from "../features/settings/services/smtp-config-input.ts";
import { getSmtpConfig, saveSmtpConfig } from "../features/settings/services/smtp-config-service.ts";
import { sendTestEmail } from "../features/settings/services/test-email-service.ts";
import * as schema from "../db/schema.ts";

function createTempRepository() {
  const dir = mkdtempSync(join(tmpdir(), "slimming-assistant-smtp-"));
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

test("SMTP 配置输入会校验端口、安全模式和邮箱", () => {
  const parsed = parseSmtpConfigFormValues({
    host: "",
    port: "0",
    username: "",
    password: "secret",
    fromEmail: "bad-email",
    secureMode: "bad",
  });

  assert.equal(parsed.ok, false);
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.host, "请填写 SMTP 主机");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.port, "端口必须是 1 到 65535 之间的整数");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.fromEmail, "发件人地址格式不正确");
  assert.equal(parsed.ok ? "" : parsed.fieldErrors.secureMode, "安全模式无效");
});

test("SMTP 配置保存后不会把密码回显到表单值", () => {
  const { repository, cleanup } = createTempRepository();

  try {
    const saved = saveSmtpConfig(repository, {
      host: "smtp.example.com",
      port: 465,
      username: "user",
      password: "secret",
      fromEmail: "me@example.com",
      secureMode: "ssl",
      nowIso: "2026-06-26T00:00:00.000Z",
    });
    const loaded = getSmtpConfig(repository);

    assert.equal(saved.ok, true);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.ok ? loaded.data.passwordConfigured : false, true);
    assert.equal(loaded.ok ? "password" in loaded.data : true, false);
  } finally {
    cleanup();
  }
});

test("测试邮件服务会记录成功和失败状态", async () => {
  const { repository, cleanup } = createTempRepository();

  try {
    saveSmtpConfig(repository, {
      host: "smtp.example.com",
      port: 465,
      username: "user",
      password: "secret",
      fromEmail: "me@example.com",
      secureMode: "ssl",
      nowIso: "2026-06-26T00:00:00.000Z",
    });

    const success = await sendTestEmail(repository, {
      recipientEmail: "to@example.com",
      nowIso: "2026-06-26T00:00:00.000Z",
      transportFactory() {
        return { sendMail: async () => ({ messageId: "test-id" }) };
      },
    });

    const failure = await sendTestEmail(repository, {
      recipientEmail: "to@example.com",
      nowIso: "2026-06-26T00:01:00.000Z",
      transportFactory() {
        return { sendMail: async () => { throw new Error("network down"); } };
      },
    });

    assert.equal(success.ok, true);
    assert.equal(failure.ok, false);
    assert.match(failure.ok ? "" : failure.fieldErrors.form, /测试邮件发送失败/);
  } finally {
    cleanup();
  }
});
