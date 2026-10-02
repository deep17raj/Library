import { formatRupees } from "@app/shared/money";
import { Alert, PageHeader, SectionCard, Skeleton, StatCard } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useOccupancy, useRevenue, useDuesAgeing, useChurn } from "./api.js";

export function InsightsPage() {
  return (
    <>
      <PageHeader
        icon={ICONS.insights}
        title="Insights"
        description="Occupancy, revenue, dues and student trends at a glance."
      />
      <div className="flex flex-col gap-8">
        <OccupancySection />
        <RevenueSection />
        <DuesSection />
        <ChurnSection />
      </div>
    </>
  );
}

function OccupancySection() {
  const { data, isLoading, error } = useOccupancy();
  if (isLoading) return <Skeleton rows={2} />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  if (!data?.length) return null;
  return (
    <SectionCard title="Occupancy by slot">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((s) => (
          <div key={s.slotId} className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">{s.slotName}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-brand">
              {s.totalSeats ? Math.round((s.active / s.totalSeats) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-500">
              {s.active} of {s.totalSeats} seats filled
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function RevenueSection() {
  const { data, isLoading, error } = useRevenue();
  if (isLoading) return <Skeleton rows={2} />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  if (!data?.length) return null;
  return (
    <SectionCard title="Revenue (last 6 months)">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((m) => (
          <StatCard
            key={m.month}
            icon={ICONS.payment}
            tone="green"
            label={m.month}
            value={formatRupees(m.totalPaise)}
            hint={`${m.paymentCount} payments`}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function DuesSection() {
  const { data, isLoading, error } = useDuesAgeing();
  if (isLoading) return <Skeleton rows={2} />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  if (!data) return null;
  const buckets = [
    { label: "0–7 days", ...data.current },
    { label: "8–30 days", ...data.month },
    { label: "30+ days", ...data.overdue },
  ];
  return (
    <SectionCard title="Dues ageing">
      <div className="grid gap-3 sm:grid-cols-3">
        {buckets.map((b) => (
          <StatCard
            key={b.label}
            icon={ICONS.dues}
            tone={b === buckets[2] ? "red" : "slate"}
            label={b.label}
            value={formatRupees(b.totalPaise)}
            hint={`${b.memberCount} student${b.memberCount !== 1 ? "s" : ""}`}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function ChurnSection() {
  const { data, isLoading, error } = useChurn();
  if (isLoading) return <Skeleton rows={2} />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  if (!data?.length) return null;
  return (
    <SectionCard title="New vs churned (last 6 months)">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-2 font-medium">Month</th>
              <th className="pb-2 font-medium">New</th>
              <th className="pb-2 font-medium">Churned</th>
              <th className="pb-2 font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((m) => (
              <tr key={m.month}>
                <td className="py-2 font-medium text-slate-900">{m.month}</td>
                <td className="py-2 text-emerald-700">+{m.newCount}</td>
                <td className="py-2 text-red-700">−{m.churnedCount}</td>
                <td
                  className={`py-2 font-medium ${m.newCount - m.churnedCount >= 0 ? "text-emerald-700" : "text-red-700"}`}
                >
                  {m.newCount - m.churnedCount >= 0 ? "+" : ""}
                  {m.newCount - m.churnedCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
