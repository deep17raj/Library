import { useState } from "react";
import { Alert, Button, Card } from "@app/shared/ui";
import { openIdProof, useRemovePhoto, useUploadIdProof, useUploadPhoto } from "../api.js";
import { FilePick } from "./FilePick.jsx";

/** Photo (public) and ID proof (private, opened through the authenticated API). */
export function MemberFilesCard({ member }) {
  const uploadPhoto = useUploadPhoto();
  const removePhoto = useRemovePhoto();
  const uploadIdProof = useUploadIdProof();
  const [openError, setOpenError] = useState("");
  const error = uploadPhoto.error || removePhoto.error || uploadIdProof.error;

  const viewIdProof = () => openIdProof(member.id).catch((e) => setOpenError(e.message));

  return (
    <Card className="flex flex-col gap-4 text-sm">
      <h2 className="font-semibold">Photo & ID proof</h2>
      <Alert tone="error">
        {error?.fields?.photo || error?.fields?.idProof || error?.message || openError}
      </Alert>
      <div className="flex flex-col gap-2">
        <FilePick
          label={member.photoUrl ? "Replace photo" : "Upload photo"}
          onPick={(file) => file && uploadPhoto.mutate({ id: member.id, file })}
        />
        {member.photoUrl && (
          <Button
            variant="ghost"
            className="self-start px-2 py-1 text-xs"
            busy={removePhoto.isPending}
            onClick={() => removePhoto.mutate(member.id)}
          >
            Remove photo
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <FilePick
          label={member.hasIdProof ? "Replace ID proof" : "Upload ID proof"}
          onPick={(file) => file && uploadIdProof.mutate({ id: member.id, file })}
        />
        {member.hasIdProof && (
          <Button
            variant="secondary"
            className="self-start px-3 py-1 text-xs"
            onClick={viewIdProof}
          >
            View ID proof
          </Button>
        )}
        <p className="text-xs text-slate-500">
          ID proofs are private: only staff who manage members can open them.
        </p>
      </div>
    </Card>
  );
}
