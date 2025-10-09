// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "../lib/api";
import type { Mission } from "../types";
import { useAuth } from "../store/auth";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [missions, setMissions] = useState<Mission[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) récupérer toutes les missions
        const data = (await endpoints.listMissions()) as Mission[];
        if (!alive) return;
        setMissions(data);

        // 2) compter les puzzles de chaque mission en parallèle
        const entries = await Promise.all(
          data.map(async (m) => {
            try {
              const puzzles = (await endpoints.listPuzzlesForMission(m.id)) as any[];
              return [m.id, puzzles.length] as const;
            } catch {
              return [m.id, 0] as const;
            }
          })
        );
        if (!alive) return;
        setCounts(Object.fromEntries(entries));
      } catch (e: any) {
        if (!alive) return;
        setErr(e.message ?? "Impossible de charger les missions.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <div className="p-4">Chargement…</div>;

  if (err) {
    return (
      <div className="p-4">
        <div className="text-red-600">Erreur : {err}</div>
        <button
          className="mt-3 px-3 py-1.5 rounded-md border"
          onClick={() => window.location.reload()}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Bienvenue, {user?.username ?? "Alex"} <span role="img" aria-label="wave">👋</span>
      </h1>

      <section className="grid md:grid-cols-2 gap-4">
        {missions.map((m) => (
          <div key={m.id} className="bg-white border rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold">Mission : {m.title}</h2>
            <div className="text-sm text-gray-600 mt-1">
              Difficulté : {m.difficulty} — Note max : {m.max_score}
              {counts[m.id] != null && (
                <> — {counts[m.id]} puzzle{counts[m.id] > 1 ? "s" : ""}</>
              )}
            </div>
            {m.description && (
              <p className="text-sm text-gray-500 mt-1">{m.description}</p>
            )}
            <button
              className="mt-3 px-3 py-1.5 rounded-md bg-gray-900 text-white hover:opacity-90"
              onClick={() => nav(`/missions/${m.id}`)}
            >
              Ouvrir
            </button>
          </div>
        ))}
        {missions.length === 0 && (
          <div className="text-sm text-gray-500">Aucune mission disponible.</div>
        )}
      </section>
    </div>
  );
}
