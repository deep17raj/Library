import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import { displayDate } from "@app/shared/time";
import { Alert, Badge, Button, Card, PageHeader, Spinner } from "@app/shared/ui";
import { useCan } from "../../app/permissions.js";
import { AddBookingDialog } from "../seating/components/BookingDialogs.jsx";
import { BookingList } from "../seating/components/BookingList.jsx";
import { useMember } from "./api.js";
import { EditMemberDialog } from "./components/EditMemberDialog.jsx";
import { MemberAvatar } from "./components/MemberAvatar.jsx";
import { MemberFilesCard } from "./components/MemberFilesCard.jsx";
import { SeatHistoryCard } from "./components/SeatHistoryCard.jsx";

export function MemberDetailPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useMember(id);
  const canManage = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const canAllocate = useCan(PERMISSIONS.SEATS_ALLOCATE);
  const [dialog, setDialog] = useState(null); // "edit" | "book"

  if (isLoading) return <Spinner />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  const { member, subscriptions, seatHistory } = data;

  return (
    <>
      <Link to="/members" className="text-sm text-brand-dark hover:underline">
        ← Members
      </Link>
      <PageHeader
        title={member.name}
        description={`${member.memberCode} · ${member.phone}`}
        actions={
          canManage && (
            <Button variant="secondary" onClick={() => setDialog("edit")}>
              Edit
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-center gap-2 text-center text-sm">
            <MemberAvatar member={member} size="lg" />
            {member.status === "inactive" && <Badge tone="red">Inactive</Badge>}
            <p className="text-slate-600">{member.examTarget || "Exam not set"}</p>
            <p className="text-slate-500">Joined {displayDate(member.joinedOn)}</p>
            {member.address && <p className="text-slate-500">{member.address}</p>}
            {member.notes && <p className="italic text-slate-500">{member.notes}</p>}
          </Card>
          {canManage && <MemberFilesCard member={member} />}
        </div>
        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Seat bookings</h2>
              {canAllocate && member.status === "active" && (
                <Button variant="secondary" onClick={() => setDialog("book")}>
                  Add booking
                </Button>
              )}
            </div>
            <BookingList
              subscriptions={subscriptions}
              memberName={member.name}
              canAllocate={canAllocate}
            />
          </Card>
          <SeatHistoryCard history={seatHistory} />
        </div>
      </div>
      <EditMemberDialog open={dialog === "edit"} member={member} onClose={() => setDialog(null)} />
      {dialog === "book" && (
        <AddBookingDialog memberId={member.id} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
