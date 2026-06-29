// src/hooks/useLessons.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface Lesson {
  id: string;
  title: string;
  content: string;
  category: "DIGITAL_LITERACY" | "LEADERSHIP" | "ENTREPRENEURSHIP";
  estimatedMinutes: number;
  skillTags: string[];
  createdAt: string;
  updatedAt: string;
}

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLessons = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<Lesson[]>("/api/lessons");
      setLessons(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  return { lessons, isLoading, error, refetch: fetchLessons };
}

export function useLessonMutation() {
  const [isMutating, setIsMutating] = useState(false);

  const createLesson = async (data: Omit<Lesson, "id" | "createdAt" | "updatedAt">) => {
    try {
      setIsMutating(true);
      return await apiClient.post<Lesson>("/api/admin/lessons", data);
    } finally {
      setIsMutating(false);
    }
  };

  const updateLesson = async (id: string, updates: Partial<Lesson>) => {
    try {
      setIsMutating(true);
      return await apiClient.patch<Lesson>(`/api/admin/lessons/${id}`, updates);
    } finally {
      setIsMutating(false);
    }
  };

  const deleteLesson = async (id: string) => {
    try {
      setIsMutating(true);
      return await apiClient.delete<{ success: boolean }>(`/api/admin/lessons/${id}`);
    } finally {
      setIsMutating(false);
    }
  };

  return { createLesson, updateLesson, deleteLesson, isMutating };
}
