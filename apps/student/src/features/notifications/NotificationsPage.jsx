import { useState } from "react";
import { displayDateTime } from "@app/shared/time";
import { Alert, Button, EmptyState, PageHeader, Skeleton } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useInbox, useMarkRead } from "./api.js";

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useInbox(page);
  const markRead = useMarkRead();

  return (
    <>
      <PageHeader icon={ICONS.notifications} title="Notifications" />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={4} />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={ICONS.notifications}
          title="No notifications"
          description="Notices from your library will appear here."
        />
      )}
      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.readAt && markRead.mutate(n.id)}
              className={`rounded-2xl px-4 py-3 text-left shadow-sm ring-1 ring-slate-200/70 transition ${
                n.readAt ? "bg-white" : "bg-brand-light/30 ring-brand/20"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{n.title}</span>
                {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
              <p className="mt-1 text-xs text-slate-400">{displayDateTime(n.createdAt)}</p>
            </button>
          ))}
          {data.total > data.pageSize && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Newer
              </Button>
              <span className="text-xs text-slate-500">
                {page} / {Math.ceil(data.total / data.pageSize)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Older
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
