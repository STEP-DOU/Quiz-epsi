import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "../lib/api";
import { useAuth } from "../store/auth";
import type { Puzzle } from "../types";
import { useGame } from "../store/game";

export default function Dashboard() {
  const { token, user } = useAuth();
  const [missions, setMissions] = useState<Puzzle[]>([]);
  const [starting, setStarting] = useState<number | null>(null);
  const { start, setInitial, reset } = useGame();
  const nav = useNavigate();

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = (await endpoints.listPuzzles(token)) as Puzzle[];
        setMissions(data);
      } catch (e) {
        console.error(e);
      }
    })();

    // Quand on arrive sur l'accueil : timer non lancé et figé à la valeur initiale
    reset();
    setInitial(1200); // 20:00
  }, [token]);

  async function handlePlay(missionId: number) {
    if (!token) return;
    setStarting(missionId);
    try {
      // 1) démarrer le timer immédiatement
      start(1200);
      // 2) (optionnel) informer le back
      await endpoints.startSession(token, 1200).catch(() => null);
      // 3) naviguer vers la mission
      nav(`/puzzles/${missionId}`);
    } catch (e: any) {
      alert("Impossible de démarrer la mission : " + e.message);
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bienvenue, {user?.username} 👋</h1>
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        {missions.map((m) => (
          <div key={m.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold">Mission : {m.title}</h2>
            <div className="text-sm text-gray-600 mt-1">Score max: {m.max_score}</div>
            <button
              className="mt-3 px-3 py-1.5 rounded-md bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
              onClick={() => handlePlay(m.id)}
              disabled={starting === m.id}
            >
              {starting === m.id ? "Ouverture…" : "Jouer"}
            </button>
          </div>
        ))}
        {missions.length === 0 && (
          <div className="text-sm text-gray-500">Aucune mission pour l’instant.</div>
        )}
      </section>
    </div>
  );
}
