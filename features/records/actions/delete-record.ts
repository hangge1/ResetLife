"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTrustedDevice } from "@/features/access/services/route-guards";
import { createRecordsRepository } from "../repositories/records-repository.ts";
import { deleteHealthRecord, deleteRunRecord } from "../services/records-service.ts";

export async function deleteRecordAction(formData: FormData) {
  await requireTrustedDevice();

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const confirmed = formData.get("confirmDelete") === "yes";

  if (!confirmed) {
    redirect("/history?deleteError=confirm");
  }

  const repository = createRecordsRepository();
  const deleted =
    kind === "health"
      ? deleteHealthRecord(repository, id)
      : kind === "run"
        ? deleteRunRecord(repository, id)
        : { ok: false as const, error: { message: "记录类型无效" } };

  if (!deleted.ok || !deleted.data) {
    redirect("/history?deleteError=failed");
  }

  revalidatePath("/history");
  revalidatePath("/records");
  redirect("/history?deleted=1");
}
