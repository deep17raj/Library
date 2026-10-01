import { cx } from "./cx.js";

/** White surface that groups related content. */
export function Card({ className, children }) {
  return (
    <section
      className={cx("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70", className)}
    >
      {children}
    </section>
  );
}

/** Card with a header: icon, title, one-line description, actions. */
export function SectionCard({ icon: Icon, title, description, actions, className, children }) {
  return (
    <Card className={className}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />}
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </Card>
  );
}

/**
 * Top of every page: icon tile, title, what the page is for, primary action.
 * `back` renders above the title (e.g. a link to the list).
 */
export function PageHeader({ icon: Icon, title, description, actions, back }) {
  return (
    <header className="mb-6">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Empty lists teach: what goes here, why it matters, and the action that fills it. */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STAT_TONES = {
  brand: "bg-brand-light text-brand-dark",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
};

/** One number that matters, with what it means. */
export function StatCard({ icon: Icon, label, value, hint, tone = "brand" }) {
  return (
    <Card className="flex items-start gap-4">
      {Icon && (
        <span
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            STAT_TONES[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </Card>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
      {label}
    </div>
  );
}

/** Placeholder rows while a list loads. */
export function Skeleton({ rows = 3 }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-200/70" />
      ))}
    </div>
  );
}
