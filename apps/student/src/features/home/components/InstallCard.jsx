import { useState } from "react";
import { ICONS } from "@app/shared/icons";
import { Button, Card, IconButton } from "@app/shared/ui";
import { useInstallPrompt } from "../../../app/pwa.js";

const DISMISSED_KEY = "install-card-dismissed";

// A per-phone convenience (not business data), so localStorage is fine; it may be
// unavailable (private mode), which just means the card shows again.
function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * "Put the app on your home screen" as a card the student can close — never a pop-up
 * (UI-GUIDE §11). Android gets the real install button; iPhone gets the two steps.
 */
export function InstallCard({ libraryName }) {
  const { canInstall, installed, ios, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(readDismissed);
  if (installed || dismissed || (!canInstall && !ios)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore: see readDismissed
    }
  };

  return (
    <Card className="relative bg-gradient-to-br from-brand to-brand-dark text-white ring-0">
      <IconButton
        icon={ICONS.close}
        label="Not now"
        onClick={dismiss}
        className="absolute right-2 top-2 text-white/80 hover:bg-white/10"
      />
      <ICONS.installApp className="h-7 w-7" aria-hidden="true" />
      <p className="mt-2 font-semibold">Add {libraryName} to your home screen</p>
      {ios ? (
        <p className="mt-1 text-sm text-white/85">
          Tap the Share button in Safari, then “Add to Home Screen”. It opens like an app.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-white/85">Open it in one tap, like any other app.</p>
          <Button variant="secondary" className="mt-3" onClick={install}>
            Install app
          </Button>
        </>
      )}
    </Card>
  );
}
