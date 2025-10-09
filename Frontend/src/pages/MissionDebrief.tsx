// src/pages/MissionDebrief.tsx
import { useParams, useNavigate } from "react-router-dom";
import { scenarios } from "../scenario";

export default function MissionDebrief() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const nav = useNavigate();

  const scen = scenarios[missionId];

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">Mission terminée ✅</h1>

      {scen ? (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">{scen.debriefTitle}</h2>
          <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
            {scen.debrief.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-sm text-gray-600">Pas de récap spécifique pour cette mission.</div>
      )}

      <div className="flex gap-2">
        <button className="px-3 py-1.5 rounded-md border" onClick={() => nav(-1)}>
          Revoir la mission
        </button>
        <button
          className="px-3 py-1.5 rounded-md bg-gray-900 text-white"
          onClick={() => nav("/")}
        >
          Retour à l’accueil
        </button>
      </div>
    </div>
  );
}
