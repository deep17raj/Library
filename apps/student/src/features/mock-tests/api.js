import { useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { LIBRARY_SLUG } from "../../app/library.js";

const KEY = ["mock-tests"];

export function useMockTests() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get("/tests") });
}

/** URL that streams the PDF through the authenticated student API. */
export function pdfUrl(id) {
  return `/api/s/${LIBRARY_SLUG}/tests/${id}/pdf`;
}
