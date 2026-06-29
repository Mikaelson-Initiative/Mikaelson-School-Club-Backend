// src/hooks/useAccountability.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import type { Habit, HabitLog } from "./useHabits";

export interface PartnerProgress {
  partnerId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  habits: (Habit & {
    logs: HabitLog[];
    loggedToday: boolean;
  })[];
}

export function usePartnerProgress() {
  const [partner, setPartner] = useState<PartnerProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await apiClient.get<PartnerProgress | null>("/api/accountability/partner-progress");
      setPartner(result);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { partner, isLoading, error, refetch: fetchProgress };
}

export function useAccountabilityMutation() {
  const [isMutating, setIsMutating] = useState(false);

  const setPartner = async (partnerEmail: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean; partnerId: string }>("/api/accountability/partner", { partnerEmail });
    } finally {
      setIsMutating(false);
    }
  };

  const createGroup = async (name: string, memberEmails: string[]) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean; groupId: string }>("/api/accountability/group", { name, memberEmails });
    } finally {
      setIsMutating(false);
    }
  };

  const nudge = async (targetUserId: string, message?: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean; message: string }>("/api/accountability/nudge", { targetUserId, message });
    } finally {
      setIsMutating(false);
    }
  };

  return { setPartner, createGroup, nudge, isMutating };
}
