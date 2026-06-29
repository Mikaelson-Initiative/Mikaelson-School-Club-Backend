// src/hooks/useHabits.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface Habit {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  currentStreak: number;
  longestStreak: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  loggedDate: string;
  createdAt: string;
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHabits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<Habit[]>("/api/habits/me");
      setHabits(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  return { habits, isLoading, error, refetch: fetchHabits };
}

export function useHabitHistory(habitId: string | undefined) {
  const [history, setHistory] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!habitId) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<HabitLog[]>(`/api/habits/${habitId}/history`);
      setHistory(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, error, refetch: fetchHistory };
}

export function useHabitMutation() {
  const [isMutating, setIsMutating] = useState(false);

  const createHabit = async (name: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<Habit>("/api/habits", { name });
    } finally {
      setIsMutating(false);
    }
  };

  const logHabit = async (habitId: string, loggedDate?: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<HabitLog>(`/api/habits/${habitId}/log`, { loggedDate });
    } finally {
      setIsMutating(false);
    }
  };

  return { createHabit, logHabit, isMutating };
}
