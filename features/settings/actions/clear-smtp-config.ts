"use server";

import { revalidatePath } from "next/cache";
import { requireUserAuthContext } from "@/features/access/services/route-guards";
import { createGlobalSettingsRepository } from "@/features/access/services/scoped-repositories";
import { clearSmtpConfig } from "../services/smtp-config-service.ts";

export async function clearSmtpConfigAction() {
  const auth = await requireUserAuthContext();

  if (auth.role !== "admin") {
    return;
  }

  clearSmtpConfig(createGlobalSettingsRepository(), new Date().toISOString());
  revalidatePath("/settings");
}
