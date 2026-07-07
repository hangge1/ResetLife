"use server";

import { revalidatePath } from "next/cache";
import { requireUserAuthContext } from "@/features/access/services/route-guards";
import { createGlobalSettingsRepository } from "@/features/access/services/scoped-repositories";
import { sendTestEmail } from "../services/test-email-service.ts";
import type { TestEmailFormState } from "./send-test-email-state";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendTestEmailAction(
  _previousState: TestEmailFormState,
  formData: FormData,
): Promise<TestEmailFormState> {
  const auth = await requireUserAuthContext();

  if (auth.role !== "admin") {
    return { fieldErrors: { form: "只有管理员可以测试 SMTP 发信配置" } };
  }

  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();

  if (!isValidEmail(recipientEmail)) {
    return { fieldErrors: { recipientEmail: "收件邮箱格式不正确" } };
  }

  const sent = await sendTestEmail(createGlobalSettingsRepository(), {
    recipientEmail,
    nowIso: new Date().toISOString(),
  });

  if (!sent.ok) {
    return { fieldErrors: sent.fieldErrors };
  }

  revalidatePath("/settings");

  return {
    fieldErrors: {},
    successMessage: sent.data.message,
  };
}
