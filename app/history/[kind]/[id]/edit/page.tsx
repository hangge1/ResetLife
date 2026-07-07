import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthContext } from "@/features/access/services/route-guards";
import { createRecordsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { HealthRecordEditForm } from "@/features/records/components/health-record-edit-form";
import { RunRecordEditForm } from "@/features/records/components/run-record-edit-form";
import { healthRecordToEditValues } from "@/features/records/actions/health-record-edit-state";
import { runRecordToEditValues } from "@/features/records/actions/run-record-edit-state";

export const dynamic = "force-dynamic";

type EditHistoryRecordPageProps = {
  params: Promise<{
    kind: string;
    id: string;
  }>;
};

export default async function EditHistoryRecordPage({ params }: EditHistoryRecordPageProps) {
  const auth = await requireAuthContext();

  const { kind, id } = await params;
  const repository = createRecordsRepositoryForAuth(auth);

  if (kind === "health") {
    const record = repository.listHealthRecords();
    const target = record.ok ? record.data.find((item) => item.id === id) : null;

    if (!target) {
      notFound();
    }

    return (
      <AppShell>
        <main className="page-main">
          <section className="card p-4">
            <div className="mb-4">
              <Link className="text-link text-sm" href="/history">
                返回历史
              </Link>
              <h1 className="m-0 mt-2 text-[28px] font-semibold leading-tight text-[var(--ink-primary)]">
                编辑健康记录
              </h1>
            </div>
            <HealthRecordEditForm
              id={target.id}
              initialState={{ values: healthRecordToEditValues(target), fieldErrors: {} }}
            />
          </section>
        </main>
      </AppShell>
    );
  }

  if (kind === "run") {
    const record = repository.getRunRecordById(id);
    const target = record.ok ? record.data : null;

    if (!target) {
      notFound();
    }

    return (
      <AppShell>
        <main className="page-main">
          <section className="card p-4">
            <div className="mb-4">
              <Link className="text-link text-sm" href="/history">
                返回历史
              </Link>
              <h1 className="m-0 mt-2 text-[28px] font-semibold leading-tight text-[var(--ink-primary)]">
                编辑跑步记录
              </h1>
            </div>
            <RunRecordEditForm
              id={target.id}
              initialState={{ values: runRecordToEditValues(target), fieldErrors: {} }}
            />
          </section>
        </main>
      </AppShell>
    );
  }

  notFound();
}
