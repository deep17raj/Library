import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatCard,
  useToast,
} from "@app/shared/ui";
import { downloadFile } from "../../app/download.js";
import { ICONS } from "@app/shared/icons";
import { useCan } from "../../app/permissions.js";
import { useDues } from "./api.js";

const BUCKETS = [
  { value: "all", label: "Everyone" },
  { value: "0-7", label: "Up to a week" },
  { value: "8-30", label: "8–30 days" },
  { value: "30+", label: "Over a month" },
];

/** Who owes money now, oldest debt first (UI-GUIDE §11 Dues). */
export function DuesPage() {
  const { data, isLoading, error } = useDues();
  const [bucket, setBucket] = useState("all");
  const canCollect = useCan(PERMISSIONS.PAYMENTS_COLLECT);
  const toast = useToast();
  const members = (data?.members ?? []).filter((m) => bucket === "all" || m.bucket === bucket);
  const exportCsv = () =>
    downloadFile("/admin/export/dues.csv", "dues.csv").catch((e) =>
      toast(e.message, { tone: "error" }),
    );

  return (
    <>
      <PageHeader
        icon={ICONS.dues}
        title="Dues"
        description="Students who owe money now, oldest first. Collect from their page."
        actions={
          canCollect && (
            <Button variant="secondary" icon={ICONS.export} onClick={exportCsv}>
              Export CSV
            </Button>
          )
        }
      />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={4} />}
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={ICONS.dues}
              tone={data.totals.all ? "red" : "green"}
              label="Total owed now"
              value={formatRupees(data.totals.all)}
              hint={`${data.members.length} students`}
            />
            <StatCard
              icon={ICONS.date}
              tone="amber"
              label="Late 8–30 days"
              value={formatRupees(data.totals["8-30"])}
            />
            <StatCard
              icon={ICONS.date}
              tone="red"
              label="Late over a month"
              value={formatRupees(data.totals["30+"])}
            />
          </div>
          <SegmentedControl value={bucket} onChange={setBucket} options={BUCKETS} />
          {members.length === 0 ? (
            <EmptyState
              icon={ICONS.dues}
              title="Nobody owes money here"
              description="When a fee falls due and isn't paid, the student shows up in this list."
            />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-100">
                {members.map((member) => (
                  <DueRow key={member.memberId} member={member} canCollect={canCollect} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function DueRow({ member, canCollect }) {
  const navigate = useNavigate();
  const late = member.daysOverdue === 0 ? "Due today" : `${member.daysOverdue} days late`;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link
          to={`/members/${member.memberId}`}
          className="font-medium text-slate-900 hover:text-brand-dark"
        >
          {member.name}
        </Link>
        <p className="text-sm text-slate-500">
          {member.memberCode} · {member.phone} · since {displayDate(member.overdueSince)}
        </p>
      </div>
      <Badge tone={member.bucket === "0-7" ? "amber" : "red"} dot>
        {late}
      </Badge>
      <span className="w-24 text-right font-semibold tabular-nums text-red-700">
        {formatRupees(member.outstandingPaise)}
      </span>
      {canCollect && (
        <Button
          size="sm"
          icon={ICONS.payment}
          onClick={() => navigate(`/members/${member.memberId}`, { state: { collect: true } })}
        >
          Collect
        </Button>
      )}
    </li>
  );
}
