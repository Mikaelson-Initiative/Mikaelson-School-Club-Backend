// src/hooks/useApplications.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Prisma } from "@prisma/client";

export type Application = Prisma.ApplicationGetPayload<{}>;

export function useApplications(filters?: { status?: string; search?: string }) {
  const [data, setData] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<Application[]>("/api/admin/applications", { params: filters });
      setData(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.status, filters?.search]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return { data, isLoading, error, refetch: fetchApplications };
}

export function useApplicationMutation() {
  const [isMutating, setIsMutating] = useState(false);

  const updateApplication = async (id: string, updates: Partial<Application>) => {
    try {
      setIsMutating(true);
      return await apiClient.patch<Application>(`/api/admin/applications/${id}`, updates);
    } finally {
      setIsMutating(false);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      setIsMutating(true);
      return await apiClient.delete<{ success: boolean }>(`/api/admin/applications/${id}`);
    } finally {
      setIsMutating(false);
    }
  };

  return { updateApplication, deleteApplication, isMutating };
}
