"use server";

import { revalidatePath } from "next/cache";
import { createUserRepository } from "../repositories/user-repository.ts";
import { requireUserAuthContext } from "../services/route-guards";
import { changeUserPassword } from "../services/user-auth-service.ts";

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
  const auth = await requireUserAuthContext();

  const changed = await changeUserPassword(createUserRepository(), {
    userId: auth.userId,
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
