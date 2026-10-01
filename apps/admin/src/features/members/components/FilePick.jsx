import { useId } from "react";

/** A labelled image picker that hands back the chosen File (upload happens elsewhere). */
export function FilePick({ label, onPick }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
