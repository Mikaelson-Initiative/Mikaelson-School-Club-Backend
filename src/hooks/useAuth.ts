// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: "STUDENT" | "MENTOR" | "CHAMPION" | "ADMIN" | "SUPERADMIN";
  avatarUrl: string | null;
  emailVerified: string | null;
  chapterId?: string | null;
  gradeLevel?: string | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch user profile from the members/me endpoint (which returns active profile details)
      const data = await apiClient.get<UserProfile>("/api/members/me");
      setUser(data);
    } catch (err: any) {
      setUser(null);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, isLoading, error, refetch: fetchUser };
}

export function useAuthActions() {
  const [isMutating, setIsMutating] = useState(false);


  const signup = async (payload: {
    email: string;
    name: string;
    password?: string;
    role: "STUDENT" | "MENTOR" | "CHAMPION";
    chapterId?: string;
    gradeLevel?: string;
  }) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean; id: string }>("/api/auth/signup", payload);
    } finally {
      setIsMutating(false);
    }
  };

  const logout = async () => {
    try {
      setIsMutating(true);
      await apiClient.post("/api/auth/logout", {});
      window.location.href = "/admin/login";
    } finally {
      setIsMutating(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean; message: string }>("/api/auth/reset-request", { email });
    } finally {
      setIsMutating(false);
    }
  };

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      setIsMutating(true);
      return await apiClient.post<{ success: boolean; message: string }>("/api/auth/reset-confirm", { token, password });
    } finally {
      setIsMutating(false);
    }
  };

  const updateProfile = async (updates: { name?: string; avatarUrl?: string; gradeLevel?: string }) => {
    try {
      setIsMutating(true);
      return await apiClient.patch<UserProfile>("/api/members/me", updates);
    } finally {
      setIsMutating(false);
    }
  };

  return {

    signup,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    isMutating,
  };
}
