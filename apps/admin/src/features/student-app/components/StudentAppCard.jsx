import { ICONS } from "@app/shared/icons";
import { Button, SectionCard, useToast } from "@app/shared/ui";
import { QrImage } from "../../../app/QrImage.jsx";
import { useStudentAppUrl } from "../api.js";

/**
 * Settings: the library's student app address and a QR to print for the notice board.
 * Students install it from there; staff give each one a sign-in code on their member page.
 */
export function StudentAppCard() {
  const url = useStudentAppUrl();
  const toast = useToast();
  if (!url) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Couldn't copy the link", { tone: "error" });
    }
  };
  return (
    <SectionCard
      icon={ICONS.installApp}
      title="Student app"
      description="Share this link or print the QR. Give each student a sign-in code from their member page."
    >
      <div className="flex flex-wrap items-center gap-5">
        <QrImage text={url} size={136} />
        <div className="flex min-w-0 flex-col gap-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm font-medium text-brand-dark"
          >
            {url}
          </a>
          <div>
            <Button size="sm" variant="secondary" onClick={copy}>
              Copy link
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
