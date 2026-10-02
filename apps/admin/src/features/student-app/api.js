import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";
import { useSession } from "../../app/session.js";

const accessKey = (memberId) => ["library", "app-access", memberId];

/** `{ granted, mustChangePassword, lastLoginAt }` for one member. */
export function useAppAccess(memberId) {
  return useQuery({
    queryKey: accessKey(memberId),
    queryFn: async () => (await api.get(`/admin/members/${memberId}/app-access`)).appAccess,
    enabled: Boolean(memberId),
  });
}

/** Give (or reset) app access → `{ temporaryPassword, appAccess }`, shown once. */
export function useGrantAppAccess(memberId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/admin/members/${memberId}/app-access`),
    onSuccess: ({ appAccess }) => queryClient.setQueryData(accessKey(memberId), appAccess),
  });
}

/** The library's student app address (null for a super admin outside a library). */
export function useStudentAppUrl() {
  const { data: user } = useSession();
  const slug = user?.library?.slug;
  return slug ? `${window.location.origin}/s/${slug}/` : null;
}
