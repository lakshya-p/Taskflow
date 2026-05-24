const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown[];
};

let accessToken = localStorage.getItem("taskflow_access_token") || "";
let refreshToken = localStorage.getItem("taskflow_refresh_token") || "";

export const tokenStore = {
  get accessToken() {
    return accessToken;
  },
  get refreshToken() {
    return refreshToken;
  },
  set(access: string, refresh: string) {
    accessToken = access;
    refreshToken = refresh;
    localStorage.setItem("taskflow_access_token", access);
    localStorage.setItem("taskflow_refresh_token", refresh);
  },
  clear() {
    accessToken = "";
    refreshToken = "";
    localStorage.removeItem("taskflow_access_token");
    localStorage.removeItem("taskflow_refresh_token");
  }
};

export function authUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let payload: ApiResult<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResult<T>;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    throw new Error(payload?.message || text || "Request failed");
  }
  if (!payload) {
    throw new Error("Invalid API response");
  }
  return payload.data;
}
