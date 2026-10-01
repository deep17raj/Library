import { useRef } from "react";
import { Alert, Button, Card } from "@app/shared/ui";
import { useRemoveLogo, useUploadLogo } from "../api.js";

const MAX_BYTES = 2 * 1024 * 1024;

/** Upload or remove the library logo (shown in the admin sidebar and the student app). */
export function LogoCard({ settings }) {
  const upload = useUploadLogo();
  const remove = useRemoveLogo();
  const fileInput = useRef(/** @type {HTMLInputElement | null} */ (null));
  const error = upload.error || remove.error;

  const onFileChosen = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      window.alert("Please choose an image smaller than 2 MB.");
      return;
    }
    upload.mutate(file);
  };

  return (
    <Card>
      <h2 className="mb-3 font-semibold">Logo</h2>
      <Alert tone="error" className="mb-3">
        {error?.fields?.logo || error?.message}
      </Alert>
      <div className="mb-4 flex h-28 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200">
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt="Library logo"
            className="max-h-24 max-w-full object-contain"
          />
        ) : (
          <span className="text-sm text-slate-500">No logo yet</span>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onFileChosen}
      />
      <div className="flex gap-2">
        <Button busy={upload.isPending} onClick={() => fileInput.current?.click()}>
          {settings.logoUrl ? "Replace" : "Upload"}
        </Button>
        {settings.logoUrl && (
          <Button variant="ghost" busy={remove.isPending} onClick={() => remove.mutate()}>
            Remove
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">JPG, PNG or WebP, up to 2 MB.</p>
    </Card>
  );
}
