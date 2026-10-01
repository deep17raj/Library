import { useState } from "react";
import { ROLE_LABELS } from "@app/shared/constants";
import { displayDateTime } from "@app/shared/time";
import { Alert, Button, Card } from "@app/shared/ui";
import { useSetUserStatus } from "../api.js";
import { AddOwnerDialog } from "./AddOwnerDialog.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

/** Owner and staff logins of a library; the super admin can add owners and disable logins. */
export function AccountsCard({ library }) {
  const setUserStatus = useSetUserStatus();
  const [adding, setAdding] = useState(false);

  const toggle = (user) => {
    const status = user.status === "active" ? "disabled" : "active";
    setUserStatus.mutate({ userId: user.id, status });
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Logins</h2>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          Add owner
        </Button>
      </div>
      <Alert tone="error" className="mb-3">
        {setUserStatus.error?.message}
      </Alert>
      <ul className="divide-y divide-slate-100">
        {library.users.map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {user.name}{" "}
                <span className="font-normal text-slate-500">· {ROLE_LABELS[user.role]}</span>
              </p>
              <p className="truncate text-slate-500">{user.email}</p>
              <p className="text-xs text-slate-400">
                Last sign-in: {displayDateTime(user.lastLoginAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={user.status} />
              <Button
                variant="ghost"
                onClick={() => toggle(user)}
                disabled={setUserStatus.isPending}
              >
                {user.status === "active" ? "Disable" : "Enable"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <AddOwnerDialog libraryId={library.id} open={adding} onClose={() => setAdding(false)} />
    </Card>
  );
}
