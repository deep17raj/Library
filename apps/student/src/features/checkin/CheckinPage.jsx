import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { Alert, Button, Card, PageHeader, TextField } from "@app/shared/ui";
import { useMe } from "../../app/session.js";
import { codeFromScan, useCheckin } from "./api.js";
import { CheckinResult, describeError, describeOutcome } from "./components/CheckinResult.jsx";
import { canScanInApp, QrScanner } from "./components/QrScanner.jsx";

/**
 * Check in by the desk's QR (UI-GUIDE §10 Student check-in). Three ways, best first:
 * scan inside the app (Android Chrome), open the QR with the phone's camera (the link
 * lands here with ?code=… and checks in by itself), or type the code shown on the desk.
 */
export function CheckinPage() {
  const [params, setParams] = useSearchParams();
  const { data: me } = useMe();
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
        title="Check in"
        description="Scan the QR code at the library desk. Scan again when you leave."
      />
      <div className="flex flex-col gap-4">
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
              className="h-14 text-base"
              busy={checkin.isPending}
              onClick={() => setScanning(true)}
            >
              Scan the desk QR
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
