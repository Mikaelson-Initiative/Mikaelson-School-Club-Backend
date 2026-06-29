// src/types/api.d.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared types for API request and response shapes.
// Import these in route handlers and client-side fetch utilities.
// ─────────────────────────────────────────────────────────────────────────────

// ── Generic API response wrapper ─────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  data: T;
  success: true;
}

export interface ApiError {
  error: string;
  success?: false;
  retryAfter?: number; // seconds — present on 429 responses
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ── Route handler context (Next.js App Router) ────────────────────────────────

export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  params: P;
}

// ── Common ID param ───────────────────────────────────────────────────────────

export interface IdParam {
  id: string;
}

// ── Upload response ───────────────────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}

// ── Metrics dashboard ─────────────────────────────────────────────────────────

export interface MetricsResponse {
  schoolsRegistered: number;
  activeChapters: number;
  studentsEnrolled: number;
  trainedChampions: number;
  volunteerApplications: number;
  schoolEnquiries: number;
  sponsorEnquiries: number;
  pendingApplications: number;
  unreadMessages: number;
  totalBlogPosts: number;
  publishedPosts: number;
  upcomingEvents: number;
}

// ── Health check ──────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  uptime: number;
  timestamp: string;
  checks: {
    database: "ok" | "error";
    redis?: "ok" | "error";
  };
  version: string;
}