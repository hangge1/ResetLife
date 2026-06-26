import { AppShell } from "@/components/layout/app-shell";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppShell>
      <main className="page-main">
        <section className="card p-4">
          <p className="mb-2 text-sm font-semibold text-[var(--ink-secondary)]">功能占位</p>
          <h1 className="m-0 text-[28px] font-semibold leading-tight tracking-normal text-[var(--ink-primary)]">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--ink-secondary)]">{description}</p>
        </section>
      </main>
    </AppShell>
  );
}
