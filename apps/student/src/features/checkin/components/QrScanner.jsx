import { useEffect, useRef, useState } from "react";
import { Alert } from "@app/shared/ui";

/** Can this browser read QR codes from the camera? (Chrome on Android: yes; iPhone: no.) */
export const canScanInApp = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices;

/**
 * Live camera view that reports the first QR code it sees, then stops the camera.
 * Uses the browser's own BarcodeDetector (no library to download).
 * @param {{ onScan: (text: string) => void }} props
 */
export function QrScanner({ onScan }) {
  const video = useRef(null);
  const [error, setError] = useState("");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

    async function look() {
      if (stopped) return;
      try {
        const [code] = await detector.detect(video.current);
        if (code?.rawValue) {
          stopped = true;
          onScanRef.current(code.rawValue);
          return;
        }
      } catch {
        // frame not ready yet
      }
      timer = setTimeout(look, 250);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((media) => {
        stream = media;
        if (stopped) return undefined;
        video.current.srcObject = media;
        return video.current.play().then(look);
      })
      .catch(() =>
        setError("We couldn't open the camera. Allow camera access, or type the code below."),
      );

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (error) return <Alert tone="warning">{error}</Alert>;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
      {/* Aiming frame */}
      <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
    </div>
  );
}
