// src/lib/api.ts
// URL de l'API FastAPI (définie dans .env : VITE_API_URL=http://127.0.0.1:8000)
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/**
 * Wrapper fetch générique :
 * - envoie/parse le JSON
 * - gère CORS
 * - remonte un message d'erreur utile si non-OK
 */
export async function api(path: string, opts: ApiOptions = {}) {
  const { method = "GET", body, token, headers = {}, signal } = opts;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    keepalive: false,
    signal,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const detail =
      (payload && (payload.detail || payload.message)) ||
      (typeof payload === "string" && payload) ||
      `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return payload;
}

/* ------------------------------------------------------------------ */
/* -------------------------- Endpoints ------------------------------ */
/* ------------------------------------------------------------------ */

export const endpoints = {
  /* ---------- Auth ---------- */
  register: (username: string, password: string) =>
    api("/users/register", { method: "POST", body: { username, password } }),

  login: (username: string, password: string) =>
    api("/users/login", {
      method: "POST",
      body: { username, password },
    }) as Promise<{ access_token: string; token_type: string }>,

  me: (token: string) => api("/users/me", { token }),

  /* ---------- Utilisateurs / Classement ---------- */
  listUsers: (token: string) => api("/users", { token }),
  myTotalScore: (token: string) => api("/users/score_total", { token }),
  leaderboard: () => api("/users/leaderboard"),

  /* ---------- Gameplay / Sessions ---------- */
  startSession: (token: string, durationSeconds = 1200) =>
    api("/game/session", {
      method: "POST",
      token,
      body: { duration_seconds: durationSeconds },
    }),

  getSessionCurrent: (token: string) => api("/game/session/current", { token }),

  /* ---------- Puzzles ---------- */
  listPuzzles: (token: string) => api("/game/puzzles", { token }),
  getPuzzle: (token: string, id: number) => api(`/game/puzzles/${id}`, { token }),

  submitAnswer: (token: string, puzzle_id: number, answer: unknown) =>
    api("/game/submit", {
      method: "POST",
      token,
      body: { puzzle_id, answer },
    }),
};
