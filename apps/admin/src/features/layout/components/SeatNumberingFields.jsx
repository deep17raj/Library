import { nextSeatNumber, seatLabel } from "@app/shared/layout";
import { TextField } from "@app/shared/ui";

/**
 * Prefix + start number inputs with a live preview ("A-13 … A-30"), shared by the
 * add-tables and add-seats dialogs.
 * @param {{ form: any, errors: any, seatCount: number, existingLabels: string[] }} props
 */
export function SeatNumberingFields({ form, errors, seatCount, existingLabels }) {
  const prefix = form.watch("seatPrefix") ?? "";
  const start = Number(form.watch("startNumber")) || 1;
  const count = Math.max(0, Number(seatCount) || 0);
  const preview =
    count > 0
      ? `${seatLabel(prefix, start)}${count > 1 ? ` … ${seatLabel(prefix, start + count - 1)}` : ""}`
      : "";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Seat number prefix"
          hint="e.g. A- gives A-1, A-2…"
          error={errors.seatPrefix?.message}
          {...form.register("seatPrefix", {
            // Changing the prefix moves the start to just after that prefix's highest seat.
            onChange: (event) =>
              form.setValue("startNumber", nextSeatNumber(existingLabels, event.target.value)),
          })}
        />
        <TextField
          label="First number"
          inputMode="numeric"
          error={errors.startNumber?.message}
          {...form.register("startNumber")}
        />
      </div>
      {preview && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {count} seat{count === 1 ? "" : "s"}: <span className="font-mono">{preview}</span>
        </p>
      )}
    </>
  );
}
