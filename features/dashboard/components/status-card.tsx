const toneClass = {
  health: "bg-[var(--health-soft)] text-[#047857]",
  motion: "bg-[var(--motion-soft)] text-[#0369a1]",
  warning: "bg-[var(--warning-soft)] text-[#92400e]",
} as const;

type StatusCardProps = {
  title: string;
  value: string;
  unit?: string;
  description: string;
  tone: keyof typeof toneClass;
};

export function StatusCard({ title, value, unit = "", description, tone }: StatusCardProps) {
  return (
    <article className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-semibold text-[var(--ink-secondary)]">{title}</h2>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${toneClass[tone]}`}>
          {title}
        </span>
      </div>
      <div className="flex min-h-9 items-baseline gap-2">
        <span className="text-[28px] font-bold leading-tight text-[var(--ink-primary)]">{value}</span>
        {unit ? <span className="text-sm font-semibold text-[var(--ink-secondary)]">{unit}</span> : null}
      </div>
      <p className="mt-2 text-sm text-[var(--ink-secondary)]">{description}</p>
    </article>
  );
}
