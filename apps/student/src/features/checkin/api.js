import { useMutation } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { queryClient } from "../../app/queryClient.js";

/** Check in (or out) with the desk's code; Home and attendance refresh after. */
export function useCheckin() {
  return useMutation({
    mutationFn: (code) => api.post("/checkin", { code }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
      ]),
  });
}

/**
 * The code inside whatever was scanned: the desk QR holds a link
 * (…/s/<slug>/checkin?code=7KQ9MT); a typed code is just the code.
 */
export function codeFromScan(text) {
  const value = String(text || "").trim();
  try {
    const fromLink = new URL(value).searchParams.get("code");
    if (fromLink) return fromLink.toUpperCase();
  } catch {
    // not a link
  }
  return /^[A-Za-z0-9]{4,12}$/.test(value) ? value.toUpperCase() : "";
}
