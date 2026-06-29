// src/lib/api-client.ts
// Standardized client-side fetch wrapper for the frontend

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean>;
};

class ApiError extends Error {
  public status: number;
  public data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = "ApiError";
  }
}

async function fetchWithHandler<T>(url: string, options?: FetchOptions): Promise<T> {
  const { params, ...init } = options || {};

  // Attach query params if provided
  let targetUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    targetUrl += `?${searchParams.toString()}`;
  }

  // Ensure JSON headers are set
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(targetUrl, { ...init, headers });

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      typeof data === "object" && data?.error ? data.error : response.statusText,
      response.status,
      data
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(url: string, options?: FetchOptions) => 
    fetchWithHandler<T>(url, { ...options, method: "GET" }),
  
  post: <T>(url: string, body: any, options?: FetchOptions) => 
    fetchWithHandler<T>(url, { ...options, method: "POST", body: JSON.stringify(body) }),
  
  patch: <T>(url: string, body: any, options?: FetchOptions) => 
    fetchWithHandler<T>(url, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  
  delete: <T>(url: string, options?: FetchOptions) => 
    fetchWithHandler<T>(url, { ...options, method: "DELETE" }),
};
