// src/pages/MissionDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endpoints } from "../lib/api";
import type { Puzzle } from "../types";
import { scenarios } from "../scenario";

export default function MissionDetail() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const nav = useNavigate();

  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const scen = scenarios[missionId];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const list = (await endpoints.listPuzzlesForMission(missionId)) as Puzzle[];
        if (!alive) return;
        setPuzzles(list);
      } catch (e: any) {
        if (!alive) return;
        setErr(e.message ?? "Chargement impossible.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [missionId]);

  const firstId = useMemo(
    () => (puzzles.length ? puzzles[0].id : undefined),
    [puzzles]
  );

  if (loading) return <div>Chargement…</div>;
  if (err) return <div className="text-red-600">Erreur : {err}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => nav(-1)} className="text-sm text-blue-600">
        ← Retour
      </button>

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
        <h1 className="text-2xl font-bold">Mission #{missionId}</h1>

        {scen && (
          <>
            <h2 className="text-lg font-semibold">{scen.introTitle}</h2>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {scen.intro.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>

            <h3 className="text-base font-semibold mt-3">Objectifs</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {scen.objectives.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            disabled={!firstId}
            onClick={() => firstId && nav(`/puzzles/${firstId}`)}
            className="px-4 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50"
          >
            Démarrer la mission
          </button>
          <span className="text-sm text-gray-500">
            {puzzles.length} puzzle{puzzles.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Puzzles de la mission</h3>
        <div className="grid gap-3">
          {puzzles.map((p) => (
            <div key={p.id} className="border rounded-lg p-4 bg-white">
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm text-gray-600">
                Type: {p.type} — Score max: {p.max_score}
              </div>
              <button
                className="mt-2 px-3 py-1.5 rounded-md border"
                onClick={() => nav(`/puzzles/${p.id}`)}
              >
                Jouer
              </button>
            </div>
          ))}
          {puzzles.length === 0 && (
            <div className="text-sm text-gray-500">
              Aucun puzzle pour cette mission.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
