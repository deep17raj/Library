import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { useRefreshSeating } from "../seating/api.js";

/** @param {{ q?: string, status?: string, slotId?: string, page?: number }} filters */
export function useMembers(filters) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
  );
  return useQuery({
    queryKey: ["library", "members", filters],
    queryFn: () => api.get(`/admin/members?${params}`),
    placeholderData: keepPreviousData, // keep the table while the next page loads
  });
}

/** { member, subscriptions, seatHistory } */
export function useMember(id) {
  return useQuery({
    queryKey: ["library", "member", id],
    queryFn: () => api.get(`/admin/members/${id}`),
  });
}

/** Member writes refresh every seating view (the member may now sit somewhere). */
function useMemberMutation(mutationFn) {
  const refresh = useRefreshSeating();
  return useMutation({ mutationFn, onSuccess: refresh });
}

export const useCreateMember = () =>
  useMemberMutation((values) => api.post("/admin/members", values));

export const useUpdateMember = (id) =>
  useMemberMutation((values) => api.patch(`/admin/members/${id}`, values));

function upload(path, field, file) {
  const form = new FormData();
  form.append(field, file);
  return api.post(path, form);
}

export const useUploadPhoto = () =>
  useMemberMutation(({ id, file }) => upload(`/admin/members/${id}/photo`, "photo", file));

export const useRemovePhoto = () =>
  useMemberMutation((id) => api.delete(`/admin/members/${id}/photo`));

export const useUploadIdProof = () =>
  useMemberMutation(({ id, file }) => upload(`/admin/members/${id}/id-proof`, "idProof", file));

/** The ID proof is private: fetched with the session cookie and shown from a blob URL. */
export async function openIdProof(id) {
  const response = await fetch(`/api/admin/members/${id}/id-proof`, { credentials: "same-origin" });
  if (!response.ok) throw new Error("Could not open the ID proof");
  window.open(URL.createObjectURL(await response.blob()), "_blank", "noopener");
}
