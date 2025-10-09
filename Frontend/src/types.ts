export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

/** Ancienne notion — gardée si tu utilises encore les missions */
export interface Mission {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  max_score: number;
}

/** Puzzles (QUIZ / CODE / DND / SCHEMA) renvoyés par /game/puzzles */
export interface Puzzle {
  id: number;
  title: string;
  type: "QUIZ" | "CODE" | "DND" | "SCHEMA";
  payload: any;            // varie selon le type
  max_score: number;
}
