import { ALL_PERMISSIONS, hasPermission, PERMISSION_LABELS } from "@app/shared/constants";
import { Checkbox } from "@app/shared/ui";
import { useSession } from "../../../app/session.js";

/**
 * Disabled checkboxes are left out of the submitted values, so a locked permission the
 * member already has would look "removed". Put those back before saving.
 * @param {string[]} selected what the form submitted
 * @param {string[]} original the member's permissions before editing ([] when new)
 * @param {object} me the signed-in user
 */
export function keepLockedPermissions(selected, original, me) {
  const locked = original.filter((permission) => !hasPermission(me, permission));
  return [...new Set([...(selected || []), ...locked])];
}

/**
 * One checkbox per permission, all registered as `permissions` (react-hook-form makes
 * the array). Permissions you don't hold yourself are shown but locked — the server
 * refuses to let you give or take them away.
 */
export function PermissionChecklist({ register, error }) {
  const { data: me } = useSession();
  return (
    <fieldset className="flex flex-col gap-2 pt-2">
      <legend className="mb-1 text-sm font-medium text-slate-800">What can they do?</legend>
      {ALL_PERMISSIONS.map((permission) => (
        <Checkbox
          key={permission}
          value={permission}
          label={PERMISSION_LABELS[permission]}
          disabled={!hasPermission(me, permission)}
          {...register("permissions")}
        />
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
