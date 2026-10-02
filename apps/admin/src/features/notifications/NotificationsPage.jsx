import { useState } from "react";
import { displayDateTime } from "@app/shared/time";
import { Alert, Badge, Button, EmptyState, PageHeader, Skeleton } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useNotifications } from "./api.js";
import { ComposeDialog } from "./ComposeDialog.jsx";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useNotifications(page);
  const [showCompose, setShowCompose] = useState(false);

  return (
    <>
      <PageHeader
        icon={ICONS.notifications}
        title="Notifications"
        description={
          data ? `${data.total} notifications sent` : "Announcements and automated reminders."
        }
        actions={
          <Button icon={ICONS.add} onClick={() => setShowCompose(true)}>
            Send notification
          </Button>
        }
      />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={4} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={ICONS.notifications}
          title="No notifications yet"
          description="Send an announcement to your students — they'll see it in the app and as a push notification."
          action={
            <Button icon={ICONS.add} onClick={() => setShowCompose(true)}>
              Send notification
            </Button>
          }
        />
      )}
      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
            {data.items.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </div>
          {data.total > data.pageSize && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {page} of {Math.ceil(data.total / data.pageSize)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
      {showCompose && <ComposeDialog onClose={() => setShowCompose(false)} />}
    </>
  );
}

function NotificationRow({ notification: n }) {
  const kindLabel = {
    announcement: "Announcement",
    fee_due: "Fee reminder",
    seat_expiry: "Expiry notice",
    waitlist: "Waitlist",
    mocktest: "Mock test",
    system: "System",
  };
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{n.title}</span>
            <Badge tone={n.kind === "announcement" ? "brand" : "slate"}>
              {kindLabel[n.kind] || n.kind}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-500">{displayDateTime(n.createdAt)}</span>
      </div>
      <div className="flex gap-3 text-xs text-slate-500">
        <span>{n.recipientsCount} recipients</span>
        <span>{n.pushSent} push sent</span>
        {n.pushFailed > 0 && <span className="text-red-600">{n.pushFailed} failed</span>}
      </div>
    </div>
  );
}
