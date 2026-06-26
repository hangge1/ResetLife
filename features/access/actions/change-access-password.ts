"use server";

import { revalidatePath } from "next/cache";
import { requireTrustedDevice } from "../services/route-guards";
import { createAccessRepository } from "../repositories/access-repository.ts";
import { changeAccessPassword } from "../services/access-management-service.ts";

export type ChangeAccessPasswordState = {
  fieldErrors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  };
  successMessage?: string;
};

export async function changeAccessPasswordAction(
  _previousState: ChangeAccessPasswordState,
  formData: FormData,
): Promise<ChangeAccessPasswordState> {
  await requireTrustedDevice();

  const changed = await changeAccessPassword(createAccessRepository(), {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    nowIso: new Date().toISOString(),
  });

  if (!changed.ok) {
    return { fieldErrors: changed.fieldErrors };
  }

  revalidatePath("/settings");
  return {
    fieldErrors: {},
    successMessage: "已修改访问密码",
  };
}
