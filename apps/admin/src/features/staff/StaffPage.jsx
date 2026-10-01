import { useState } from "react";
import { ROLE_LABELS, ROLES } from "@app/shared/constants";
import { displayDateTime } from "@app/shared/time";
import { Alert, Button, Card, PageHeader, Spinner } from "@app/shared/ui";
import { useSession } from "../../app/session.js";
import { StatusBadge } from "../../app/StatusBadge.jsx";
import { useStaff } from "./api.js";
import { StaffDialog } from "./components/StaffDialog.jsx";
import { ResetPasswordDialog } from "./components/ResetPasswordDialog.jsx";
import { ICONS } from "../../app/icons.js";

const CLOSED = { mode: null, member: null };

export function StaffPage() {
  const { data: staff, isLoading, error } = useStaff();
  const { data: me } = useSession();
  const [dialog, setDialog] = useState(CLOSED);
  const close = () => setDialog(CLOSED);

  return (
    <>
      <PageHeader
        icon={ICONS.staff}
        title="Staff"
        description="Logins for people who help run the library, and what each may do."
        actions={
          <Button onClick={() => setDialog({ mode: "create", member: null })} icon={ICONS.add}>
            Add staff
          </Button>
        }
      />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Spinner />}
      {staff && (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {staff.map((member) => (
              <StaffRow
                key={member.id}
                member={member}
                editable={member.role === ROLES.STAFF && member.id !== me.id}
                onEdit={() => setDialog({ mode: "edit", member })}
                onResetPassword={() => setDialog({ mode: "password", member })}
              />
            ))}
          </ul>
        </Card>
      )}
      <StaffDialog
        open={dialog.mode === "create" || dialog.mode === "edit"}
        member={dialog.mode === "edit" ? dialog.member : null}
        onClose={close}
      />
      {dialog.mode === "password" && <ResetPasswordDialog member={dialog.member} onClose={close} />}
    </>
  );
}

function StaffRow({ member, editable, onEdit, onResetPassword }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
      <div className="min-w-0">
        <p className="font-medium">
          {member.name}{" "}
          <span className="font-normal text-slate-500">· {ROLE_LABELS[member.role]}</span>
        </p>
        <p className="text-slate-500">{member.email}</p>
        <p className="text-xs text-slate-400">
          {member.role === ROLES.ADMIN ? "Full access" : `${member.permissions.length} permissions`}
          {" · "}Last sign-in: {displayDateTime(member.lastLoginAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={member.status} />
        {editable && (
          <>
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" onClick={onResetPassword}>
              Reset password
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
