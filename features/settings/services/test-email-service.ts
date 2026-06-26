import nodemailer from "nodemailer";
import type { createSettingsRepository } from "../repositories/settings-repository.ts";
import { saveSettingValue } from "./settings-service.ts";
import { getSmtpConfigWithSecret } from "./smtp-config-service.ts";

type SettingsRepository = ReturnType<typeof createSettingsRepository>;

type MailTransport = {
  sendMail(input: {
    from: string;
    to: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

type SendTestEmailInput = {
  recipientEmail: string;
  nowIso: string;
  transportFactory?: (config: {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    auth?: { user: string; pass: string };
  }) => MailTransport;
};

function createTransport(config: {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth?: { user: string; pass: string };
}): MailTransport {
  return nodemailer.createTransport(config);
}

async function saveTestStatus(
  repository: SettingsRepository,
  status: "success" | "failure",
  message: string,
  nowIso: string,
) {
  saveSettingValue(repository, {
    type: "smtp",
    key: "last-test",
    value: { status, message, testedAtIso: nowIso },
    nowIso,
  });
}

export async function sendTestEmail(repository: SettingsRepository, input: SendTestEmailInput) {
  const config = getSmtpConfigWithSecret(repository);

  if (!config.ok) {
    return config;
  }

  if (!config.data || !config.data.host || !config.data.fromEmail) {
    return { ok: false as const, fieldErrors: { form: "请先保存完整的 SMTP 配置" } };
  }

  try {
    const transport = (input.transportFactory ?? createTransport)({
      host: config.data.host,
      port: config.data.port,
      secure: config.data.secureMode === "ssl",
      requireTLS: config.data.secureMode === "starttls",
      auth:
        config.data.username || config.data.password
          ? { user: config.data.username, pass: config.data.password }
          : undefined,
    });

    await transport.sendMail({
      from: config.data.fromEmail,
      to: input.recipientEmail,
      subject: "瘦身助手测试邮件",
      text: "这是一封来自瘦身助手的测试邮件，用于确认邮件提醒配置可用。",
    });

    await saveTestStatus(repository, "success", "测试邮件发送成功", input.nowIso);
    return { ok: true as const, data: { message: "测试邮件发送成功" } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "未知错误";
    const message = `测试邮件发送失败：${detail}`;
    await saveTestStatus(repository, "failure", message, input.nowIso);
    return { ok: false as const, fieldErrors: { form: message } };
  }
}
