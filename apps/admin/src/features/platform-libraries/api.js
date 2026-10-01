import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const LIBRARIES_KEY = ["platform", "libraries"];
const libraryKey = (id) => ["platform", "libraries", id];

export function useLibraries() {
  return useQuery({
    queryKey: LIBRARIES_KEY,
    queryFn: async () => (await api.get("/platform/libraries")).libraries,
  });
}

export function useLibrary(id) {
  return useQuery({
    queryKey: libraryKey(id),
    queryFn: async () => (await api.get(`/platform/libraries/${id}`)).library,
  });
}

/**
 * Every library mutation answers with the updated library: store it for the detail
 * screen and refresh the list.
 */
function useLibraryMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: ({ library }) => {
      queryClient.setQueryData(libraryKey(library.id), library);
      queryClient.invalidateQueries({ queryKey: LIBRARIES_KEY, exact: true });
    },
  });
}

export const useCreateLibrary = () =>
  useLibraryMutation((values) => api.post("/platform/libraries", values));

export const useUpdateLibrary = (id) =>
  useLibraryMutation((values) => api.patch(`/platform/libraries/${id}`, values));

export const useSetLibraryStatus = (id) =>
  useLibraryMutation((status) => api.patch(`/platform/libraries/${id}/status`, { status }));

export const useAddOwner = (id) =>
  useLibraryMutation((values) => api.post(`/platform/libraries/${id}/owners`, values));

export const useSetUserStatus = () =>
  useLibraryMutation(({ userId, status }) =>
    api.patch(`/platform/users/${userId}/status`, { status }),
  );
