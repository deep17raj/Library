import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { Alert, Button, Card, PageHeader, TextField } from "@app/shared/ui";
import { useMe } from "../../app/session.js";
import { codeFromScan, useCheckin } from "./api.js";
import { CheckinResult, describeError, describeOutcome } from "./components/CheckinResult.jsx";
import { canScanInApp, QrScanner } from "./components/QrScanner.jsx";
import { cx } from "@app/shared/ui";

/**
 * Check in by the desk's QR (UI-GUIDE §10 Student check-in). Three ways, best first:
 * scan inside the app (Android Chrome), open the QR with the phone's camera (the link
 * lands here with ?code=… and checks in by itself), or type the code shown on the desk.
 */
export function CheckinPage() {
  const [params, setParams] = useSearchParams();
  const { data: me } = useMe();
  const inside = !!(me?.checkIns[0] && !me.checkIns[0].checkOutAt);
  const checkin = useCheckin();
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState("");
  const linkHandled = useRef(false);

  const submit = async (code) => {
    setHint("");
    try {
      setResult(describeOutcome(await checkin.mutateAsync(code), me.library.timezone));
    } catch (error) {
      setResult(describeError(error));
    }
  };

  // Came from the phone camera with ?code=…: check in once, and drop the code from the
  // address so a refresh can't turn it into a check-out.
  useEffect(() => {
    const code = codeFromScan(params.get("code"));
    if (!code || linkHandled.current) return;
    linkHandled.current = true;
    setParams({}, { replace: true });
    submit(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the link
  }, []);

  const onScan = (text) => {
    setScanning(false);
    const code = codeFromScan(text);
    if (code) submit(code);
    else setHint("That QR isn't the library's check-in code. Scan the one on the desk.");
  };

  if (result) return <CheckinResult result={result} onAgain={() => setResult(null)} />;

  return (
    <>
      <PageHeader
        icon={ICONS.checkin}
        title={inside ? "Check out" : "Check in"}
        description={
          inside
            ? "Scan the QR at the desk when you leave."
            : "Scan the QR code at the library desk. Scan again when you leave."
        }
      />
      <div className="flex flex-col gap-4">
        {inside && (
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-800 ring-1 ring-orange-200">
            You&apos;re currently checked in. Scan the desk QR to check out.
          </div>
        )}
        <Alert tone="warning">{hint}</Alert>
        {canScanInApp() ? (
          scanning ? (
            <>
              <QrScanner onScan={onScan} />
              <Button variant="secondary" onClick={() => setScanning(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              icon={ICONS.scan}
              className={cx(
                "h-14 text-base",
                inside && "!bg-orange-500 !shadow-orange-200 hover:!bg-orange-600",
              )}
              busy={checkin.isPending}
              onClick={() => setScanning(true)}
            >
              {inside ? "Scan to check out" : "Scan the desk QR"}
            </Button>
          )
        ) : (
          <Alert tone="info" title="Use your camera app">
            Open your phone’s camera and point it at the QR on the desk, then tap the link. It
            brings you back here and checks you in.
          </Alert>
        )}
        <Card>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const code = codeFromScan(typed);
              if (code) submit(code);
              else setHint("Type the code exactly as it shows on the desk screen.");
            }}
          >
            <TextField
              className="flex-1"
              label="Or type today's code"
              placeholder="e.g. 7KQ9MT"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={12}
              value={typed}
              onChange={(event) => setTyped(event.target.value.toUpperCase())}
            />
            <Button type="submit" busy={checkin.isPending} disabled={typed.trim().length < 4}>
              Go
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
