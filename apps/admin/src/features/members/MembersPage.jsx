import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Spinner,
  TextField,
} from "@app/shared/ui";
import { useCan } from "../../app/permissions.js";
import { useSlots } from "../slots/api.js";
import { useMembers } from "./api.js";
import { MemberAvatar } from "./components/MemberAvatar.jsx";
import { ICONS } from "../../app/icons.js";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "All" },
];

export function MembersPage() {
  const [filters, setFilters] = useState({ q: "", status: "active", slotId: "", page: 1 });
  const { data, isLoading, error } = useMembers(filters);
  const { data: slots = [] } = useSlots();
  const canAdd = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value, page: 1 });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const navigate = useNavigate();
  const addButton = canAdd && (
    <Button onClick={() => navigate("/members/new")} icon={ICONS.addMember}>
      Add member
    </Button>
  );

  return (
    <>
      <PageHeader
        icon={ICONS.members}
        title="Members"
        description={data ? `${data.total} found` : undefined}
        actions={addButton}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <TextField
          placeholder="Search name, phone or member ID"
          value={filters.q}
          onChange={set("q")}
          aria-label="Search"
        />
        <SelectField
          aria-label="Slot"
          value={filters.slotId}
          onChange={set("slotId")}
          options={[
            { value: "", label: "All slots" },
            ...slots.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <SelectField
          aria-label="Status"
          value={filters.status}
          onChange={set("status")}
          options={STATUS_OPTIONS}
        />
      </div>
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Spinner />}
      {data?.total === 0 && (
        <EmptyState icon={ICONS.members} title="No members found" action={addButton} />
      )}
      {data?.members.length > 0 && (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {data.members.map((member) => (
              <MemberRow key={member.id} member={member} />
            ))}
          </ul>
        </Card>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button
            variant="secondary"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Previous
          </Button>
          <span>
            Page {filters.page} of {pages}
          </span>
          <Button
            variant="secondary"
            disabled={filters.page >= pages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}

function MemberRow({ member }) {
  return (
    <li>
      <Link
        to={`/members/${member.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
      >
        <MemberAvatar member={member} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {member.name} <span className="font-normal text-slate-500">· {member.memberCode}</span>
          </p>
          <p className="text-sm text-slate-500">{member.phone}</p>
        </div>
        <div className="hidden text-right text-sm text-slate-700 sm:block">
          {member.placements.length === 0 && <span className="text-slate-400">No seat</span>}
          {member.placements.map((p) => (
            <p key={p.subscriptionId}>
              {p.slotName} · {p.seatLabel ? `Seat ${p.seatLabel}` : `${p.hallName} (anywhere)`}
            </p>
          ))}
        </div>
      </Link>
    </li>
  );
}
