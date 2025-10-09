// src/components/Timer.tsx
import { useEffect, useMemo, useState } from "react";
import { useGame } from "../store/game";

/** ms restantes à partir d'un endAt (timestamp ms) */
function leftFrom(endAt: number | null) {
  return endAt ? Math.max(0, endAt - Date.now()) : 0;
}
function readStorageEndAt(): number | null {
  const raw = sessionStorage.getItem("mv_endAt");
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

export default function Timer() {
  // on lit séparément pour réagir finement aux updates
  const endAtStore = useGame((s) => s.endAt);
  const initialSeconds = useGame((s) => s.initialSeconds);

  // Source unique : store endAt s’il existe, sinon sessionStorage (fallback)
  const endAt = useMemo<number | null>(() => {
    return endAtStore ?? readStorageEndAt();
  }, [endAtStore]);

  const [leftMs, setLeftMs] = useState<number>(leftFrom(endAt));

  useEffect(() => {
    // synchro immédiate
    setLeftMs(leftFrom(endAt));

    // si non lancé, pas d'interval
    if (!endAt) return;

    const tick = () => setLeftMs(leftFrom(endAt));
    const t = setInterval(tick, 1000);

    // écoute (au cas où un autre onglet change le storage — optionnel)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "mv_endAt") tick();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, [endAt]);

  const running = Boolean(endAt);
  const totalSeconds = running ? Math.ceil(leftMs / 1000) : initialSeconds;
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  const danger = running && leftMs <= 60_000;

  return (
    <span
      title={running ? "Temps restant" : "Prêt à démarrer"}
      aria-live="polite"
      className={`inline-block px-3 py-1.5 text-sm rounded-md text-white ${
        danger ? "bg-red-600" : running ? "bg-emerald-600" : "bg-gray-500"
      }`}
    >
      ⏱ {mm}:{ss}
    </span>
  );
}
