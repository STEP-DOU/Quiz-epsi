// src/lib/api.ts

// Base URL de l'API (configurable via .env : VITE_API_URL=http://127.0.0.1:8000)
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

/* -------------------------------------------------- */
/* ------------------- Core wrapper ----------------- */
/* -------------------------------------------------- */

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

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

/* -------------------------------------------------- */
/* --------------------- Types ---------------------- */
/* -------------------------------------------------- */

export type LoginResponse = { access_token: string; token_type: string };

export type MissionCreate = {
  title: string;
  description?: string;
  difficulty?: string;
  max_score?: number;
};

export type PuzzleCreate = {
  title: string;
  type: "QUIZ" | "CODE" | "DND" | "SCHEMA";
  payload: any;
  solution?: any;
  max_score?: number;
  mission_id: number; // 🔗 mission parente
};

/* -------------------------------------------------- */
/* ------------------- Endpoints -------------------- */
/* -------------------------------------------------- */

export const endpoints = {
  /* ---------- Users / Auth ---------- */
  register: (username: string, password: string) =>
    api("/users/register", { method: "POST", body: { username, password } }),

  login: (username: string, password: string) =>
    api("/users/login", { method: "POST", body: { username, password } }) as Promise<LoginResponse>,

  me: (token: string) => api("/users/me", { token }),

  listUsers: (token: string) => api("/users", { token }),

  leaderboard: () => api("/users/leaderboard"),

  myTotalScore: (token: string) => api("/users/score_total", { token }),

  /* ---------- Missions ---------- */
  createMission: (body: MissionCreate) =>
    api("/missions", { method: "POST", body }),

  listMissions: () => api("/missions"),

  getMission: (id: number) => api(`/missions/${id}`),

  listPuzzlesForMission: (missionId: number) =>
    api(`/missions/${missionId}/puzzles`),

  /* ---------- Puzzles ---------- */
  createPuzzle: (body: PuzzleCreate) =>
    api("/game/puzzles", { method: "POST", body }),

  // si missionId est fourni, on filtre coté backend ?mission_id=...
  listPuzzles: (missionId?: number) =>
    missionId != null ? api(`/game/puzzles?mission_id=${missionId}`) : api("/game/puzzles"),

  getPuzzle: (id: number) => api(`/game/puzzles/${id}`),

  /* ---------- Gameplay / Session ---------- */
  startSession: (token: string, durationSeconds = 1200) =>
    api("/game/session", { method: "POST", token, body: { duration_seconds: durationSeconds } }),

  getSessionCurrent: (token: string) =>
    api("/game/session/current", { token }),

  submitAnswer: (token: string | null, puzzle_id: number, answer: unknown) =>
    api("/game/submit", { method: "POST", token: token ?? undefined, body: { puzzle_id, answer } }),
};
