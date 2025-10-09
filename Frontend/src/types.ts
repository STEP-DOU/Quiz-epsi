export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

// src/types.ts
export type MediaKind = "image" | "gif" | "video" | "lottie";

export interface MediaSpec {
  kind: MediaKind;           // "image" | "gif" | "video" | "lottie"
  src: string;               // ex: "/assets/soins/saignement.json" ou ".mp4" ou ".png"
  poster?: string;           // optionnel pour <video>
  caption?: string;          // légende affichée sous le média
  loop?: boolean;            // défaut true
  autoplay?: boolean;        // défaut true
  width?: number;            // rendu (px) optionnel
  height?: number;           // rendu (px) optionnel
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  max_score: number;
  created_at: string;
}

export interface Puzzle {
  id: number;
  mission_id: number;
  title: string;
  // nouveaux types
  type: "QUIZ" | "CODE" | "DND" | "SCHEMA" | "IMG_QUIZ" | "IMG_RECON";
  payload: any;
  solution?: any;
  max_score: number;
  created_at?: string;
}

