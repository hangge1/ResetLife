import { AppShell } from "@/components/layout/app-shell";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { AccessProtectionPanel } from "@/features/access/components/access-protection-panel";
import { createAccessRepository } from "@/features/access/repositories/access-repository";
import { listTrustedDevices } from "@/features/access/services/access-management-service";
import { createReminderRepository } from "@/features/reminders/repositories/reminder-repository";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { ReminderRuleForm } from "@/features/settings/components/reminder-rule-form";
import { SmtpConfigForm } from "@/features/settings/components/smtp-config-form";
import { TrendThresholdForm } from "@/features/settings/components/trend-threshold-form";
import { createSettingsRepository } from "@/features/settings/repositories/settings-repository";
import { getProfileSettings } from "@/features/settings/services/profile-settings-service";
import { getReminderRuleSettings } from "@/features/settings/services/reminder-rule-settings-service";
import { getSmtpConfig } from "@/features/settings/services/smtp-config-service";
import { getTrendThresholdSettings } from "@/features/settings/services/trend-threshold-settings-service";
import { profileToFormValues } from "@/features/settings/actions/profile-form-state";
import { reminderRuleToFormValues } from "@/features/settings/actions/reminder-rule-form-state";
import { smtpConfigToFormValues } from "@/features/settings/actions/smtp-config-form-state";
import { trendThresholdToFormValues } from "@/features/settings/actions/trend-threshold-form-state";

export const dynamic = "force-dynamic";

const settingGroups = [
  {
    title: "个人资料",
    description: "维护昵称、身高和提醒收件邮箱。身高会用于后续 BMI 计算。",
    items: ["昵称", "身高（厘米）", "收件邮箱"],
  },
  {
    title: "提醒规则",
    description: "配置每日提醒时间，以及站内提醒和邮件提醒开关。",
    items: ["每日提醒时间", "站内提醒", "邮件提醒"],
  },
  {
    title: "SMTP 邮件",
    description: "维护邮件发送服务器参数，并在后续步骤支持测试邮件。",
    items: ["SMTP 主机", "端口", "安全模式", "发件人地址"],
  },
  {
    title: "趋势估算",
    description: "配置预计达成时间所需的最低统计天数和最低有效记录数。",
    items: ["最低统计天数", "最低有效记录数"],
  },
  {
    title: "访问保护",
    description: "管理访问密码和受信设备，维护当前轻量访问保护状态。",
    items: ["访问密码", "受信设备"],
  },
];

export default async function SettingsPage() {
  await requireTrustedDevice();

  const repository = createSettingsRepository();
  const accessRepository = createAccessRepository();
  const reminderRepository = createReminderRepository();
  const profile = getProfileSettings(repository);
  const reminderRules = getReminderRuleSettings(repository);
  const smtpConfig = getSmtpConfig(repository);
  const latestEmailReminder = reminderRepository.getLatestEmailReminderEvent();
  const trustedDevices = listTrustedDevices(accessRepository);
  const trendThresholds = getTrendThresholdSettings(repository);
  const profileError = !profile.ok ? (profile.fieldErrors.form ?? "个人资料读取失败") : "";
  const reminderRuleError = !reminderRules.ok ? (reminderRules.fieldErrors.form ?? "提醒规则读取失败") : "";
  const smtpConfigError = !smtpConfig.ok ? (smtpConfig.fieldErrors.form ?? "SMTP 配置读取失败") : "";
  const trendThresholdError = !trendThresholds.ok ? (trendThresholds.fieldErrors.form ?? "趋势估算配置读取失败") : "";
  const initialProfileState = {
    values: profileToFormValues(profile.ok ? profile.data : null),
    fieldErrors: profile.ok ? {} : { form: profileError },
  };
  const initialTrendThresholdState = {
    values: trendThresholdToFormValues(
      trendThresholds.ok ? trendThresholds.data : { minimumDays: 7, minimumRecords: 3 },
    ),
    fieldErrors: trendThresholds.ok ? {} : { form: trendThresholdError },
  };
  const initialReminderRuleState = {
    values: reminderRuleToFormValues(
      reminderRules.ok
        ? reminderRules.data
        : { reminderTime: "20:30", inAppEnabled: false, emailEnabled: false },
    ),
    fieldErrors: reminderRules.ok ? {} : { form: reminderRuleError },
  };
  const initialSmtpConfigState = {
    values: smtpConfigToFormValues(smtpConfig.ok ? smtpConfig.data : null),
    fieldErrors: smtpConfig.ok ? {} : { form: smtpConfigError },
  };
  const emailReminderStatus =
    latestEmailReminder.ok && latestEmailReminder.data
      ? `${latestEmailReminder.data.status === "sent" ? "发送成功" : latestEmailReminder.data.status === "failed" ? "发送失败" : latestEmailReminder.data.status === "skipped" ? "已跳过" : "已创建"}：${latestEmailReminder.data.message}`
      : "还没有邮件提醒记录";
  const trustedDeviceList = trustedDevices.ok ? trustedDevices.data : [];

  return (
    <AppShell>
      <main className="page-main">
        <div className="mb-5">
          <p className="mb-1 text-sm font-semibold text-[var(--ink-secondary)]">设置</p>
          <h1 className="m-0 text-[32px] font-semibold leading-tight text-[var(--ink-primary)]">
            配置中心
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--ink-secondary)]">
            这里集中维护个人资料、提醒、邮件、趋势估算和访问保护配置。
          </p>
        </div>

        <section aria-label="配置分组" className="grid gap-4 lg:grid-cols-2">
          {settingGroups.map((group) => (
            <article className="card p-4" key={group.title}>
              <div className="mb-3">
                <h2 className="m-0 text-lg font-semibold text-[var(--ink-primary)]">{group.title}</h2>
                <p className="m-0 mt-1 text-sm text-[var(--ink-secondary)]">{group.description}</p>
              </div>
              {group.title === "个人资料" ? (
                <ProfileForm initialState={initialProfileState} />
              ) : group.title === "提醒规则" ? (
                <ReminderRuleForm initialState={initialReminderRuleState} />
              ) : group.title === "SMTP 邮件" ? (
                <div className="grid gap-4">
                  <SmtpConfigForm
                    initialState={initialSmtpConfigState}
                    passwordConfigured={smtpConfig.ok ? smtpConfig.data.passwordConfigured : false}
                  />
                  <div className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3">
                    <p className="m-0 text-sm font-semibold text-[var(--ink-primary)]">最近邮件提醒状态</p>
                    <p className="m-0 mt-1 text-sm text-[var(--ink-secondary)]">{emailReminderStatus}</p>
                  </div>
                </div>
              ) : group.title === "趋势估算" ? (
                <TrendThresholdForm initialState={initialTrendThresholdState} />
              ) : group.title === "访问保护" ? (
                <AccessProtectionPanel devices={trustedDeviceList} />
              ) : (
                <div className="grid gap-2">
                  {group.items.map((item) => (
                    <div
                      className="flex min-h-10 items-center justify-between rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
                      key={item}
                    >
                      <span className="text-[var(--ink-secondary)]">{item}</span>
                      <span className="font-semibold text-[var(--ink-primary)]">待配置</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
