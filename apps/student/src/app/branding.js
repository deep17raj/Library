import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBrandColor } from "@app/shared/ui";
import { api } from "./api.js";

/** The library's name, logo and colour — public, so the sign-in screen can show them. */
export function useLibraryBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () => (await api.get("/branding")).library,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** Paint the app in the library's colour and title the tab with its name. */
export function useApplyBranding(library) {
  useBrandColor(library?.brandColor);
  const name = library?.name;
  useEffect(() => {
    if (name) document.title = name;
  }, [name]);
}
