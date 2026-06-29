// src/hooks/useProjects.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface Project {
  id: string;
  title: string;
  description: string;
  category: "CLEAN_ENERGY" | "EDUCATION" | "HEALTH" | "AGRICULTURE" | "OTHER";
  status: "PLANNING" | "IN_PROGRESS" | "COMPLETED";
  chapterId: string;
  createdAt: string;
  updatedAt: string;
}

export function useProjects(chapterId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!chapterId) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<Project[]>(`/api/schools/${chapterId}/projects`);
      setProjects(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, isLoading, error, refetch: fetchProjects };
}

export function useProjectMutation() {
  const [isMutating, setIsMutating] = useState(false);

  const createProject = async (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => {
    try {
      setIsMutating(true);
      return await apiClient.post<Project>("/api/admin/projects", data);
    } finally {
      setIsMutating(false);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      setIsMutating(true);
      return await apiClient.patch<Project>(`/api/admin/projects/${id}`, updates);
    } finally {
      setIsMutating(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setIsMutating(true);
      return await apiClient.delete<{ success: boolean }>(`/api/admin/projects/${id}`);
    } finally {
      setIsMutating(false);
    }
  };

  return { createProject, updateProject, deleteProject, isMutating };
}
