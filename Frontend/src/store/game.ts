import { create } from "zustand";

type GameState = {
  /** Valeur de départ (en secondes), affichée quand le timer n'est pas lancé */
  initialSeconds: number;
  /** Timestamp ms de fin (null = non lancé) */
  endAt: number | null;

  /** Démarre le timer pour `seconds` (par défaut la valeur initiale) */
  start: (seconds?: number) => void;
  /** Change la valeur initiale (ex. 20min = 1200) */
  setInitial: (seconds: number) => void;
  /** Réinitialise à l'état "non lancé" (figé sur initialSeconds) */
  reset: () => void;
};

export const useGame = create<GameState>((set, get) => ({
  initialSeconds: 1200,
  endAt: null,

  start: (seconds) => {
    const secs = seconds ?? get().initialSeconds;
    const end = Date.now() + secs * 1000;
    set({ initialSeconds: secs, endAt: end });
  },

  setInitial: (seconds) => set({ initialSeconds: seconds }),

  reset: () => set({ endAt: null }),
}));

/** Calcule le temps restant (ms) */
export function getLeftMs(endAt: number | null) {
  return endAt ? Math.max(0, endAt - Date.now()) : 0;
}
