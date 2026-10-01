import { Badge } from "@app/shared/ui";

const LOOK = {
  active: { tone: "green", label: "Active" },
  suspended: { tone: "red", label: "Suspended" },
  disabled: { tone: "red", label: "Disabled" },
};

/** Status of a library or a user account. */
export function StatusBadge({ status }) {
  const look = LOOK[status] || { tone: "slate", label: status };
  return <Badge tone={look.tone}>{look.label}</Badge>;
}
