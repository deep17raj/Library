import { PAYMENT_MODE_LABELS, PAYMENT_MODES } from "@app/shared/constants";
import { SegmentedControl } from "@app/shared/ui";
import { PAYMENT_MODE_ICONS } from "../../../app/icons.js";

const OPTIONS = PAYMENT_MODES.map((mode) => ({
  value: mode,
  label: PAYMENT_MODE_LABELS[mode],
  icon: PAYMENT_MODE_ICONS[mode],
}));

/** Cash / UPI / Card / Bank / Cheque / Other as buttons with icons, bound to a form field. */
export function PaymentModeField({ form, name = "mode", label = "Paid by", error }) {
  return (
    <SegmentedControl
      label={label}
      value={form.watch(name)}
      onChange={(mode) => form.setValue(name, mode, { shouldValidate: true })}
      options={OPTIONS}
      error={error}
    />
  );
}
