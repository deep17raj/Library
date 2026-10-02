import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * A QR code for `text`, rendered as an <img> (generated in the browser, no network).
 * Used on the check-in desk so a student can open the check-in URL with a phone camera.
 * @param {{ text: string, size?: number }} props
 */
export function QrImage({ text, size = 240 }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(""));
    return () => {
      active = false;
    };
  }, [text, size]);

  if (!src) {
    return (
      <div
        className="animate-pulse rounded-xl bg-slate-100"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Check-in QR code"
      className="rounded-xl bg-white"
    />
  );
}
