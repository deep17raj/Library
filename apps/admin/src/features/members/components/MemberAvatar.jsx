import { cx } from "@app/shared/ui";

/** Photo, or the member's initials when there is none. */
export function MemberAvatar({ member, size = "md" }) {
  const box = size === "lg" ? "h-20 w-20 text-xl" : "h-10 w-10 text-sm";
  if (member.photoUrl) {
    return (
      <img src={member.photoUrl} alt="" className={cx(box, "shrink-0 rounded-full object-cover")} />
    );
  }
  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cx(
        box,
        "flex shrink-0 items-center justify-center rounded-full bg-brand-light font-medium text-brand-dark",
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
