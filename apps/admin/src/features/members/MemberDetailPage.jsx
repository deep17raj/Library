import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import { displayDate } from "@app/shared/time";
import { Alert, Badge, Button, Card, PageHeader, SectionCard, Skeleton } from "@app/shared/ui";
import { ICONS } from "../../app/icons.js";
import { useCan } from "../../app/permissions.js";
import { useToday } from "../../app/useToday.js";
import { MemberAttendanceCard } from "../attendance/components/MemberAttendanceCard.jsx";
import { AccountCard } from "../billing/components/AccountCard.jsx";
import { AddBookingDialog } from "../seating/components/BookingDialogs.jsx";
import { BookingList } from "../seating/components/BookingList.jsx";
import { useMember } from "./api.js";
import { EditMemberDialog } from "./components/EditMemberDialog.jsx";
import { MemberAvatar } from "./components/MemberAvatar.jsx";
import { MemberFilesCard } from "./components/MemberFilesCard.jsx";
import { SeatHistoryCard } from "./components/SeatHistoryCard.jsx";

/** One student: profile left; bookings, fees and history right (UI-GUIDE §10 Member page). */
export function MemberDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const today = useToday();
  const { data, isLoading, error } = useMember(id);
  const canManage = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const canAllocate = useCan(PERMISSIONS.SEATS_ALLOCATE);
  const [dialog, setDialog] = useState(null); // "edit" | "book"

  if (isLoading) return <Skeleton rows={4} />;
  if (error) return <Alert tone="error">{error.message}</Alert>;
  const { member, subscriptions, seatHistory } = data;

  return (
    <>
      <PageHeader
        back={
          <Link to="/members" className="text-sm text-brand-dark hover:underline">
            ← Members
          </Link>
        }
        icon={ICONS.member}
        title={member.name}
        description={`${member.memberCode} · ${member.phone}`}
        actions={
          canManage && (
            <Button variant="secondary" icon={ICONS.edit} onClick={() => setDialog("edit")}>
              Edit details
            </Button>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-center gap-2 text-center text-sm">
            <MemberAvatar member={member} size="lg" />
            {member.status === "inactive" && <Badge tone="red">Inactive</Badge>}
            <p className="text-slate-700">{member.examTarget || "Exam not set"}</p>
            <p className="text-slate-500">Joined {displayDate(member.joinedOn)}</p>
            {member.address && <p className="text-slate-500">{member.address}</p>}
            {member.notes && <p className="italic text-slate-500">{member.notes}</p>}
          </Card>
          {canManage && <MemberFilesCard member={member} />}
        </div>
        <div className="flex flex-col gap-6">
          <SectionCard
            icon={ICONS.seatMap}
            title="Seat bookings"
            description="Where and when this student sits."
            actions={
              canAllocate &&
              member.status === "active" && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ICONS.add}
                  onClick={() => setDialog("book")}
                >
                  Add booking
                </Button>
              )
            }
          >
            <BookingList
              subscriptions={subscriptions}
              memberName={member.name}
              canAllocate={canAllocate}
            />
          </SectionCard>
          <AccountCard
            member={member}
            today={today}
            autoCollect={Boolean(location.state?.collect)}
          />
          <MemberAttendanceCard memberId={member.id} />
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
