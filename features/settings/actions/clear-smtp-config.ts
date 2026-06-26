"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createSettingsRepository } from "../repositories/settings-repository.ts";
import { clearSmtpConfig } from "../services/smtp-config-service.ts";

export async function clearSmtpConfigAction() {
  await requireTrustedDevice();

  clearSmtpConfig(createSettingsRepository(), new Date().toISOString());
  revalidatePath("/settings");
}
