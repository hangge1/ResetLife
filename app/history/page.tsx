import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { requireAuthContext } from "@/features/access/services/route-guards";
import { createRecordsRepositoryForAuth } from "@/features/access/services/scoped-repositories";
import { deleteRecordAction } from "@/features/records/actions/delete-record";
import {
  listHistoryRecords,
  type HistoryRange,
  type HistoryRecordType,
} from "@/features/records/services/history-service";
import { getTodayLocalDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseType(value: string | undefined): HistoryRecordType {
  return value === "health" || value === "run" ? value : "all";
}

function parseRange(value: string | undefined): HistoryRange {
  return value === "last7" || value === "last30" || value === "custom" ? value : "all";
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const auth = await requireAuthContext();

  const params = (await searchParams) ?? {};
  const type = parseType(getStringParam(params, "type"));
  const range = parseRange(getStringParam(params, "range"));
  const startDate = getStringParam(params, "startDate") ?? "";
  const endDate = getStringParam(params, "endDate") ?? "";
  const deleteError = getStringParam(params, "deleteError");
  const deleted = getStringParam(params, "deleted");
  const defaultBackfillDate = endDate || startDate || getTodayLocalDate();
  const history = listHistoryRecords(createRecordsRepositoryForAuth(auth), {
    type,
    range,
    startDate,
    endDate,
    todayLocalDate: getTodayLocalDate(),
  });
  const entries = history.ok ? history.data : [];

  return (
    <AppShell authMode={auth.mode}>
      <main className="workbench-main">
        {auth.mode === "guest" ? (
          <p className="m-0 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)]">
            访客模式：历史记录来自临时会话，不会写入数据库。
          </p>
        ) : null}
        <section className="workbench-hero">
          <p className="workbench-eyebrow">记录卡片流</p>
          <h1 className="workbench-title">历史记录</h1>
          <p className="workbench-description">
            精确查询每一次健康和跑步打卡，点击记录卡片进入编辑。
          </p>
        </section>

        <div className="workbench-grid">
          <section className="workbench-card">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="workbench-card-title">筛选和补录</h2>
                <p className="workbench-card-text">先筛选记录；需要补录时选择日期跳到打卡页。</p>
              </div>
              <form action="/records" className="flex flex-col gap-2 sm:flex-row sm:items-end" method="get">
                <div className="grid gap-2">
                  <label htmlFor="backfillDate" className="text-sm font-semibold text-[var(--ink-primary)]">
                    补充历史记录
                  </label>
                  <input
                    className="min-h-10 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
                    defaultValue={defaultBackfillDate}
                    id="backfillDate"
                    name="date"
                    type="date"
                  />
                </div>
                <Button type="submit">去补录</Button>
              </form>
            </div>

            <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
              <div className="grid gap-2">
                <label htmlFor="type" className="text-sm font-semibold text-[var(--ink-primary)]">
                  类型
                </label>
                <select
                  className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
                  defaultValue={type}
                  id="type"
                  name="type"
                >
                  <option value="all">全部</option>
                  <option value="health">健康</option>
                  <option value="run">跑步</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="range" className="text-sm font-semibold text-[var(--ink-primary)]">
                  时间
                </label>
                <select
                  className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
                  defaultValue={range}
                  id="range"
                  name="range"
                >
                  <option value="all">全部</option>
                  <option value="last7">最近 7 天</option>
                  <option value="last30">最近 30 天</option>
                  <option value="custom">自定义</option>
                </select>
              </div>

              <div className="grid gap-2">
                <label htmlFor="startDate" className="text-sm font-semibold text-[var(--ink-primary)]">
                  开始日期
                </label>
                <input
                  className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
                  defaultValue={startDate}
                  id="startDate"
                  name="startDate"
                  type="date"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="endDate" className="text-sm font-semibold text-[var(--ink-primary)]">
                  结束日期
                </label>
                <input
                  className="min-h-11 rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--ink-primary)]"
                  defaultValue={endDate}
                  id="endDate"
                  name="endDate"
                  type="date"
                />
              </div>

              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  筛选
                </Button>
              </div>
            </form>
          </section>

          {history.ok ? null : (
            <p className="card m-0 border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
              {history.error.message}
            </p>
          )}

          {deleteError ? (
            <p className="card m-0 border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
              {deleteError === "confirm" ? "删除前请先确认" : "删除记录失败"}
            </p>
          ) : null}

          {deleted ? (
            <p className="card m-0 border-[var(--health)] bg-[var(--health-soft)] p-4 text-sm text-[var(--ink-primary)]">
              已删除记录
            </p>
          ) : null}

          {entries.length > 0 ? (
            <section className="workbench-grid workbench-grid--two">
              {entries.map((entry) => (
                <article className={`workbench-card ${entry.kind === "health" ? "workbench-card--health" : "workbench-card--motion"}`} key={`${entry.kind}-${entry.id}`}>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="m-0 text-sm text-[var(--ink-secondary)]">{entry.localDate}</p>
                      <h2 className="workbench-card-title">{entry.title}</h2>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                      <span className="min-h-10 rounded-md bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink-secondary)]">
                        {entry.kind === "health" ? "健康" : "跑步"}
                      </span>
                      <Link
                        className="clickable-surface inline-flex min-h-10 items-center rounded-md border border-[var(--border-soft)] bg-white px-3 text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--primary)]"
                        href={`/history/${entry.kind}/${entry.id}/edit`}
                      >
                        编辑
                      </Link>
                      <details className="rounded-md border border-[var(--border-soft)] px-3 py-2 text-sm">
                        <summary className="cursor-pointer font-semibold text-[var(--danger)]">删除</summary>
                        <form action={deleteRecordAction} className="mt-3 grid gap-3">
                          <input name="kind" type="hidden" value={entry.kind} />
                          <input name="id" type="hidden" value={entry.id} />
                          <label className="flex items-center gap-2 text-[var(--ink-primary)]">
                            <input name="confirmDelete" type="checkbox" value="yes" />
                            确认删除这条记录
                          </label>
                          <Button type="submit" variant="secondary">
                            确认删除
                          </Button>
                        </form>
                      </details>
                    </div>
                  </div>
                  <Link
                    className="mb-3 inline-flex text-sm font-black text-[var(--primary)] hover:underline"
                    href={`/history/${entry.kind}/${entry.id}/edit`}
                  >
                    打开详情
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    {entry.metrics.length > 0 ? (
                      entry.metrics.map((metric) => (
                        <span
                          className="rounded-md border border-[var(--border-soft)] px-2 py-1 text-sm text-[var(--ink-primary)]"
                          key={metric}
                        >
                          {metric}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[var(--ink-secondary)]">没有可显示的指标</span>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="workbench-card">
              <p className="m-0 text-sm text-[var(--ink-secondary)]">没有历史记录</p>
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
