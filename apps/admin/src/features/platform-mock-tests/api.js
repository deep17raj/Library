import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../app/api.js";

const KEY = ["platform", "mock-tests"];

export function useMockTests() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get("/platform/mock-tests") });
}

export function useUploadMockTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, description, pricePaise, file }) => {
      const form = new FormData();
      form.append("pdf", file);
      form.append("title", title);
      form.append("description", description ?? "");
      form.append("pricePaise", String(pricePaise));
      return api.post("/platform/mock-tests", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTogglePublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, published }) =>
      api.post(`/platform/mock-tests/${id}/${published ? "publish" : "unpublish"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
