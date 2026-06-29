// src/hooks/useChapters.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface SchoolChapter {
  id: string;
  name: string;
  city: string;
  country: string;
  status: "ACTIVE" | "INACTIVE";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  gradeLevel: string | null;
  avatarUrl: string | null;
}

export function useChapters() {
  const [data, setData] = useState<SchoolChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<SchoolChapter[]>("/api/schools");
      setData(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { data, isLoading, error, refetch: fetchChapters };
}

export function useFeaturedChapter() {
  const [chapter, setChapter] = useState<SchoolChapter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeatured = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<SchoolChapter | null>("/api/schools/featured");
      setChapter(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  return { chapter, isLoading, error, refetch: fetchFeatured };
}

export function useChapterMembers(chapterId: string | undefined) {
  const [members, setMembers] = useState<ChapterMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!chapterId) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<ChapterMember[]>(`/api/schools/${chapterId}/members`);
      setMembers(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, isLoading, error, refetch: fetchMembers };
}

export function useChapterMutation() {
  const [isMutating, setIsMutating] = useState(false);

  const createChapter = async (data: Omit<SchoolChapter, "id" | "createdAt" | "updatedAt" | "featured">) => {
    try {
      setIsMutating(true);
      return await apiClient.post<SchoolChapter>("/api/admin/schools", data);
    } finally {
      setIsMutating(false);
    }
  };

  const updateChapter = async (id: string, updates: Partial<SchoolChapter>) => {
    try {
      setIsMutating(true);
      return await apiClient.patch<SchoolChapter>(`/api/admin/schools/${id}`, updates);
    } finally {
      setIsMutating(false);
    }
  };

  const deleteChapter = async (id: string) => {
    try {
      setIsMutating(true);
      return await apiClient.delete<{ success: boolean }>(`/api/admin/schools/${id}`);
    } finally {
      setIsMutating(false);
    }
  };

  const restoreChapter = async (id: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean }>(`/api/admin/schools/${id}/restore`, {});
    } finally {
      setIsMutating(false);
    }
  };

  const featureChapter = async (id: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean }>(`/api/admin/schools/${id}/feature`, {});
    } finally {
      setIsMutating(false);
    }
  };

  return { createChapter, updateChapter, deleteChapter, restoreChapter, featureChapter, isMutating };
}
