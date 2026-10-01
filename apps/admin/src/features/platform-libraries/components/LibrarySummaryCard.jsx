import { useState } from "react";
import { displayDateTime } from "@app/shared/time";
import { Alert, Button, Card, useConfirm } from "@app/shared/ui";
import { useSetLibraryStatus } from "../api.js";
import { EditLibraryDialog } from "./EditLibraryDialog.jsx";
import { StatusBadge } from "../../../app/StatusBadge.jsx";

/** Status, revenue share and usage of one library, with suspend/activate and edit. */
export function LibrarySummaryCard({ library }) {
  const setStatus = useSetLibraryStatus(library.id);
  const [editing, setEditing] = useState(false);
  const suspended = library.status === "suspended";

  const confirm = useConfirm();
  const toggleStatus = async () => {
    const ok = await confirm(
      suspended
        ? {
            title: `Reactivate ${library.name}?`,
            message: "Its owner, staff and students can sign in again.",
            confirmLabel: "Reactivate",
            danger: false,
          }
        : {
            title: `Suspend ${library.name}?`,
            message:
              "Its owner, staff and students are signed out immediately. Nothing is deleted.",
            confirmLabel: "Suspend library",
          },
    );
    if (ok) setStatus.mutate(suspended ? "active" : "suspended");
  };

  const share =
    library.mocktestShareBps === null ? "Platform default" : `${library.mocktestShareBps / 100}%`;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Library</h2>
        <StatusBadge status={library.status} />
      </div>
      <Alert tone="error" className="mb-3">
        {setStatus.error?.message}
      </Alert>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-500">Created</dt>
        <dd>{displayDateTime(library.createdAt)}</dd>
        <dt className="text-slate-500">Mock-test share</dt>
        <dd>{share}</dd>
        <dt className="text-slate-500">Owners / staff</dt>
        <dd>
          {library.usage.ownerCount} / {library.usage.staffCount}
        </dd>
        <dt className="text-slate-500">Last staff sign-in</dt>
        <dd>{displayDateTime(library.usage.lastLoginAt)}</dd>
      </dl>
      <div className="mt-5 flex gap-2">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          variant={suspended ? "primary" : "danger"}
          busy={setStatus.isPending}
          onClick={toggleStatus}
        >
          {suspended ? "Reactivate" : "Suspend"}
        </Button>
      </div>
      <EditLibraryDialog library={library} open={editing} onClose={() => setEditing(false)} />
    </Card>
  );
}
