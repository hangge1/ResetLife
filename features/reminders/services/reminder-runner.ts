import type { createRecordsRepository } from "../../records/repositories/records-repository.ts";
import type { createSettingsRepository } from "../../settings/repositories/settings-repository.ts";
import { getProfileSettings } from "../../settings/services/profile-settings-service.ts";
import { getReminderRuleSettings } from "../../settings/services/reminder-rule-settings-service.ts";
import { getSmtpConfigWithSecret } from "../../settings/services/smtp-config-service.ts";
import type { createReminderRepository } from "../repositories/reminder-repository.ts";
import nodemailer from "nodemailer";

type RecordsRepository = ReturnType<typeof createRecordsRepository>;
type SettingsRepository = ReturnType<typeof createSettingsRepository>;
type ReminderRepository = ReturnType<typeof createReminderRepository>;

type ReminderRunnerInput = {
  recordsRepository: RecordsRepository;
  reminderRepository: ReminderRepository;
  settingsRepository: SettingsRepository;
  smtpSettingsRepository?: SettingsRepository;
  localDate: string;
  currentTime: string;
  nowIso: string;
  mailTransportFactory?: (config: {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    auth?: { user: string; pass: string };
  }) => {
    sendMail(input: {
      from: string;
      to: string;
      subject: string;
      text: string;
    }): Promise<unknown>;
  };
};

function isAtOrAfter(currentTime: string, reminderTime: string) {
  return currentTime >= reminderTime;
}

function emailReminderType(reminderTime: string) {
  return `daily_record_email_${reminderTime.replace(":", "")}`;
}

function createMailTransport(config: {
  host: string;
  port: number;
  secure: boolean;
  requireTLS: boolean;
  auth?: { user: string; pass: string };
}) {
  return nodemailer.createTransport(config);
}

export async function runReminderCheck(input: ReminderRunnerInput) {
  const rules = getReminderRuleSettings(input.settingsRepository);
  if (!rules.ok) {
    return rules;
  }

  if ((!rules.data.inAppEnabled && !rules.data.emailEnabled) || !isAtOrAfter(input.currentTime, rules.data.reminderTime)) {
    return { ok: true as const, data: { status: "skipped" as const } };
  }

  const health = input.recordsRepository.getHealthRecordByDate(input.localDate);
  const runs = input.recordsRepository.listRunRecordsByDate(input.localDate);

  if (!health.ok) {
    return { ok: false as const, fieldErrors: { form: "健康记录读取失败" } };
  }

  if (!runs.ok) {
    return { ok: false as const, fieldErrors: { form: "跑步记录读取失败" } };
  }

  if (health.data && runs.data.length > 0) {
    return { ok: true as const, data: { status: "completed" as const } };
  }

  const missing = [
    health.data ? "" : "健康记录",
    runs.data.length > 0 ? "" : "跑步记录",
  ].filter(Boolean);
  let inAppStatus: "created" | "skipped" = "skipped";

  if (rules.data.inAppEnabled) {
    const created = input.reminderRepository.createReminderEvent({
      localDate: input.localDate,
      reminderType: "daily_record",
      channel: "in_app",
      status: "created",
      message: `今天还没有完成${missing.join("和")}，可以先补一条简单记录。`,
      nowIso: input.nowIso,
    });

    if (!created.ok) {
      return { ok: false as const, fieldErrors: { form: created.error.message } };
    }

    inAppStatus = "created";
  }

  if (rules.data.emailEnabled) {
    const reminderType = emailReminderType(rules.data.reminderTime);
    const existingEmailEvent = input.reminderRepository.getReminderEvent(input.localDate, reminderType, "email");
    if (!existingEmailEvent.ok) {
      return { ok: false as const, fieldErrors: { form: existingEmailEvent.error.message } };
    }

    if (!existingEmailEvent.data) {
      const profile = getProfileSettings(input.settingsRepository);
      const smtp = getSmtpConfigWithSecret(input.smtpSettingsRepository ?? input.settingsRepository);

      if (!profile.ok || !smtp.ok || !profile.data.reminderEmail || !smtp.data?.host || !smtp.data.fromEmail) {
        input.reminderRepository.createReminderEvent({
          localDate: input.localDate,
          reminderType,
          channel: "email",
          status: "skipped",
          message: "邮件提醒未发送：请先配置 SMTP 和提醒收件邮箱。",
          nowIso: input.nowIso,
        });
      } else {
        const createdEmailEvent = input.reminderRepository.createReminderEvent({
          localDate: input.localDate,
          reminderType,
          channel: "email",
          status: "created",
          message: "邮件提醒准备发送。",
          nowIso: input.nowIso,
        });

        if (!createdEmailEvent.ok) {
          return { ok: false as const, fieldErrors: { form: createdEmailEvent.error.message } };
        }

        try {
          const transport = (input.mailTransportFactory ?? createMailTransport)({
            host: smtp.data.host,
            port: smtp.data.port,
            secure: smtp.data.secureMode === "ssl",
            requireTLS: smtp.data.secureMode === "starttls",
            auth:
              smtp.data.username || smtp.data.password
                ? { user: smtp.data.username, pass: smtp.data.password }
                : undefined,
          });

          await transport.sendMail({
            from: smtp.data.fromEmail,
            to: profile.data.reminderEmail,
            subject: "瘦身助手提醒",
            text: `今天还没有完成${missing.join("和")}，可以先补一条简单记录。`,
          });

          input.reminderRepository.updateReminderEventStatus({
            id: createdEmailEvent.data.id,
            status: "sent",
            message: "邮件提醒发送成功。",
            nowIso: input.nowIso,
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : "未知错误";
          input.reminderRepository.updateReminderEventStatus({
            id: createdEmailEvent.data.id,
            status: "failed",
            message: `邮件提醒发送失败：${detail}`,
            nowIso: input.nowIso,
          });
        }
      }
    }
  }

  return { ok: true as const, data: { status: inAppStatus } };
}
