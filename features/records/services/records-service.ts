import type {
  CreateRunRecordInput,
  UpdateHealthRecordInput,
  UpdateRunRecordInput,
  UpsertHealthRecordInput,
  createRecordsRepository,
} from "../repositories/records-repository.ts";

type RecordsRepository = ReturnType<typeof createRecordsRepository>;

type FieldErrors = {
  localDate?: string;
};

type ValidationResult = { ok: true } | { ok: false; fieldErrors: FieldErrors };

export function validateLocalDate(localDate: string): ValidationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return { ok: false, fieldErrors: { localDate: "日期必须是有效的 YYYY-MM-DD" } };
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    return { ok: false, fieldErrors: { localDate: "日期必须是有效的 YYYY-MM-DD" } };
  }

  return { ok: true };
}

export function saveHealthRecord(
  repository: RecordsRepository,
  input: UpsertHealthRecordInput,
) {
  const dateValidation = validateLocalDate(input.localDate);
  if (!dateValidation.ok) {
    return dateValidation;
  }

  return repository.upsertHealthRecord(input);
}

export function getHealthRecordByDate(repository: RecordsRepository, localDate: string) {
  const dateValidation = validateLocalDate(localDate);
  if (!dateValidation.ok) {
    return dateValidation;
  }

  return repository.getHealthRecordByDate(localDate);
}

export function listHealthRecords(repository: RecordsRepository) {
  return repository.listHealthRecords();
}

export function updateHealthRecord(
  repository: RecordsRepository,
  id: string,
  input: Omit<UpdateHealthRecordInput, "updatedAtIso"> & { nowIso: string },
) {
  if (input.localDate !== undefined) {
    const dateValidation = validateLocalDate(input.localDate);
    if (!dateValidation.ok) {
      return dateValidation;
    }
  }

  return repository.updateHealthRecord(id, {
    ...input,
    updatedAtIso: input.nowIso,
  });
}

export function deleteHealthRecord(repository: RecordsRepository, id: string) {
  return repository.deleteHealthRecord(id);
}

export function createRunRecord(
  repository: RecordsRepository,
  input: CreateRunRecordInput,
) {
  const dateValidation = validateLocalDate(input.localDate);
  if (!dateValidation.ok) {
    return dateValidation;
  }

  return repository.createRunRecord(input);
}

export function getRunRecordById(repository: RecordsRepository, id: string) {
  return repository.getRunRecordById(id);
}

export function listRunRecords(repository: RecordsRepository) {
  return repository.listRunRecords();
}

export function listRunRecordsByDate(repository: RecordsRepository, localDate: string) {
  const dateValidation = validateLocalDate(localDate);
  if (!dateValidation.ok) {
    return dateValidation;
  }

  return repository.listRunRecordsByDate(localDate);
}

export function updateRunRecord(
  repository: RecordsRepository,
  id: string,
  input: Omit<UpdateRunRecordInput, "updatedAtIso"> & { nowIso: string },
) {
  if (input.localDate !== undefined) {
    const dateValidation = validateLocalDate(input.localDate);
    if (!dateValidation.ok) {
      return dateValidation;
    }
  }

  return repository.updateRunRecord(id, {
    ...input,
    updatedAtIso: input.nowIso,
  });
}

export function deleteRunRecord(repository: RecordsRepository, id: string) {
  return repository.deleteRunRecord(id);
}
