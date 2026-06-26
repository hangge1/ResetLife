"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createSettingsRepository } from "../repositories/settings-repository.ts";
import { sendTestEmail } from "../services/test-email-service.ts";
import type { TestEmailFormState } from "./send-test-email-state";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendTestEmailAction(
  _previousState: TestEmailFormState,
  formData: FormData,
): Promise<TestEmailFormState> {
  await requireTrustedDevice();

  const recipientEmail = String(formData.get("recipientEmail") ?? "").trim();

  if (!isValidEmail(recipientEmail)) {
    return { fieldErrors: { recipientEmail: "收件邮箱格式不正确" } };
  }

  const sent = await sendTestEmail(createSettingsRepository(), {
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
