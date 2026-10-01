import { Card, PageHeader } from "@app/shared/ui";
import { useSession } from "../../app/session.js";

/** Library home. Fills up with live numbers as seats, members and fees arrive (milestones 2–8). */
export function DashboardPage() {
  const { data: user } = useSession();
  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description={user.library?.name} />
      <Card>
        <p className="text-sm text-slate-700">
          Your library account is ready. Seat layout, time slots and members come next.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Student app link: <span className="font-mono">/s/{user.library?.slug}</span>
        </p>
      </Card>
    </>
  );
}
