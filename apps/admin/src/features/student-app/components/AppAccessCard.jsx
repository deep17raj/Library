import { useState } from "react";
import { PERMISSIONS } from "@app/shared/constants";
import { ICONS } from "@app/shared/icons";
import { displayDateTime } from "@app/shared/time";
import { Badge, Button, SectionCard, useConfirm, useToast } from "@app/shared/ui";
import { useCan } from "../../../app/permissions.js";
import { useAppAccess, useGrantAppAccess } from "../api.js";
import { TemporaryPasswordDialog } from "./TemporaryPasswordDialog.jsx";

/**
 * Member page: can this student use the app? Staff give access (or reset a forgotten
 * password) here; the one-time code is then shown once [D10].
 */
export function AppAccessCard({ member }) {
  const { data: access } = useAppAccess(member.id);
  const grant = useGrantAppAccess(member.id);
  const canManage = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const confirm = useConfirm();
  const toast = useToast();
  const [code, setCode] = useState("");

  const give = async () => {
    if (
      access?.granted &&
      !(await confirm({
        title: "Reset app password?",
        message: `${member.name} will be signed out of the app on every phone and must sign in with a new code.`,
        confirmLabel: "Reset password",
      }))
    ) {
      return;
    }
    try {
      setCode((await grant.mutateAsync()).temporaryPassword);
    } catch (error) {
      toast(error.message, { tone: "error" });
    }
  };

  const status = !access?.granted
    ? { tone: "slate", label: "Not using the app" }
    : access.mustChangePassword
      ? { tone: "amber", label: "Waiting for first sign-in" }
      : { tone: "green", label: "Using the app" };

  return (
    <SectionCard
      icon={ICONS.installApp}
      title="Student app"
      description="Their seat, check-in by QR, fees and receipts on their phone."
      actions={
        canManage &&
        member.status === "active" && (
          <Button
            size="sm"
            variant={access?.granted ? "secondary" : "primary"}
            busy={grant.isPending}
            onClick={give}
          >
            {access?.granted ? "Reset password" : "Give app access"}
          </Button>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
        {access?.lastLoginAt && (
          <span className="text-slate-500">
            Last signed in {displayDateTime(access.lastLoginAt)}
          </span>
        )}
      </div>
      <TemporaryPasswordDialog
        open={Boolean(code)}
        onClose={() => setCode("")}
        member={member}
        temporaryPassword={code}
      />
    </SectionCard>
  );
}
