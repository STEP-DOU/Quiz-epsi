// src/pages/Puzzle.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { endpoints } from "../lib/api";
import { useAuth } from "../store/auth";
import { useGame, getLeftMs } from "../store/game";
import type { Puzzle } from "../types";

const keyPair = (a: string, b: string) => [a, b].sort().join("|");

export default function PuzzlePage() {
  const { id } = useParams<{ id: string }>();
  const pid = Number(id);
  const { token } = useAuth();
  const nav = useNavigate();

  // Timer global (ne démarre PAS ici)
  const endAt = useGame((s) => s.endAt);
  const initialSeconds = useGame((s) => s.initialSeconds);
  const resetTimer = useGame((s) => s.reset);

  const [leftMs, setLeftMs] = useState<number>(getLeftMs(endAt));

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [all, setAll] = useState<Puzzle[]>([]);

  // Charge la mission courante + la liste de missions (pour Prev/Suiv)
  useEffect(() => {
    if (!token) return;
    const tk = token; // narrow to string
    (async () => {
      try {
        const [puz, list] = await Promise.all([
          endpoints.getPuzzle(tk, pid),
          endpoints.listPuzzles(tk),
        ]);
        setPuzzle(puz as Puzzle);
        setAll(list as Puzzle[]);
      } catch (e: any) {
        alert("Erreur de chargement : " + (e.message ?? "inconnue"));
        nav("/");
      }
    })();
  }, [token, pid, nav]);

  // Tick d’affichage du temps (si le timer est lancé par “Jouer”)
  useEffect(() => {
    setLeftMs(getLeftMs(endAt));
    if (!endAt) return;
    const t = setInterval(() => setLeftMs(getLeftMs(endAt)), 1000);
    return () => clearInterval(t);
  }, [endAt]);

  // Bouton quitter mission : reset timer + retour à l’accueil
  function quitMission() {
    resetTimer();
    nav("/");
  }

  // Indices de navigation
  const idx = useMemo(() => all.findIndex((p) => p.id === pid), [all, pid]);
  const prevId = idx > 0 ? all[idx - 1]?.id : undefined;
  const nextId = idx >= 0 && idx < all.length - 1 ? all[idx + 1]?.id : undefined;

  // Désactivation si pas lancé ou si temps écoulé
  const disabled = !endAt || leftMs <= 0;
  const baseSeconds = endAt ? Math.ceil(leftMs / 1000) : initialSeconds;
  const mm = String(Math.floor(baseSeconds / 60)).padStart(2, "0");
  const ss = String(baseSeconds % 60).padStart(2, "0");

  async function submitAndNext(answer: unknown) {
    if (!token || !puzzle) return;
    try {
      const res = await endpoints.submitAnswer(token, puzzle.id, answer);
      const msg = `${res?.correct ? "✅ Correct" : "❌ Incorrect"} — Score: ${res?.earned_score}${
        res?.feedback ? " — " + res.feedback : ""
      }`;
      alert(msg);

      // Aller automatiquement à la mission suivante si elle existe
      if (nextId) nav(`/puzzles/${nextId}`);
      else nav("/"); // sinon retour accueil
    } catch (e: any) {
      alert(e.message || "Soumission impossible.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-sm text-blue-600">
          ← Retour
        </button>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 text-sm rounded-md text-white ${
              disabled ? "bg-red-600" : "bg-emerald-600"
            }`}
          >
            ⏱ {mm}:{ss}
          </span>
          <button
            className="text-sm px-3 py-1 rounded-md border"
            onClick={quitMission}
          >
            Quitter la mission
          </button>
        </div>
      </div>

      {!puzzle ? (
        <div>Chargement…</div>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Mission : {puzzle.title}</h1>
          <div className="text-sm text-gray-600">
            Type: {puzzle.type} — Score max: {puzzle.max_score} — {idx + 1}/{all.length}
          </div>

          {/* IMPORTANT : key={puzzle.id} force le reset des champs à chaque nouvelle mission */}
          {puzzle.type === "QUIZ" && (
            <QuizUI
              key={puzzle.id}
              payload={puzzle.payload}
              disabled={disabled}
              onSubmit={(ans) => submitAndNext(ans)}
            />
          )}
          {puzzle.type === "CODE" && (
            <CodeUI
              key={puzzle.id}
              payload={puzzle.payload}
              disabled={disabled}
              onSubmit={(ans) => submitAndNext(ans)}
            />
          )}
          {puzzle.type === "DND" && (
            <DndUI
              key={puzzle.id}
              payload={puzzle.payload}
              disabled={disabled}
              onSubmit={(ans) => submitAndNext(ans)}
            />
          )}
          {puzzle.type === "SCHEMA" && (
            <SchemaUI
              key={puzzle.id}
              payload={puzzle.payload}
              disabled={disabled}
              onSubmit={(ans) => submitAndNext(ans)}
            />
          )}

          <div className="flex gap-2 pt-2">
            {prevId && (
              <button
                className="text-sm px-3 py-1 rounded-md border"
                onClick={() => nav(`/puzzles/${prevId}`)}
              >
                ◀ Précédent
              </button>
            )}
            {nextId && (
              <button
                className="text-sm px-3 py-1 rounded-md border"
                onClick={() => nav(`/puzzles/${nextId}`)}
              >
                Suivant ▶
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ====================== QUIZ ====================== */
function QuizUI({
  payload,
  onSubmit,
  disabled,
}: {
  payload: any;
  onSubmit: (a: any) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const multi = Boolean(payload?.multi);

  function toggle(i: number) {
    setSelected((cur) =>
      multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{payload?.question}</p>
      <div className="space-y-2">
        {payload?.options?.map((opt: string, i: number) => (
          <label key={i} className="flex items-center gap-2">
            <input
              type={multi ? "checkbox" : "radio"}
              name="q"
              checked={selected.includes(i)}
              onChange={() => toggle(i)}
              disabled={disabled}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <button
        disabled={disabled}
        onClick={() => onSubmit({ selected })}
        className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
      >
        Valider
      </button>
    </div>
  );
}

/* ====================== CODE ====================== */
function CodeUI({
  payload,
  onSubmit,
  disabled,
}: {
  payload: any;
  onSubmit: (a: any) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="font-medium">
        {payload?.statement || "Entrez le code/réponse :"}
      </p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border rounded-md px-3 py-2"
        placeholder="Votre code…"
        disabled={disabled}
      />
      <button
        disabled={disabled}
        onClick={() => onSubmit({ text })}
        className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
      >
        Valider
      </button>
    </div>
  );
}

/* ======================= DND ====================== */
function DndUI({
  payload,
  onSubmit,
  disabled,
}: {
  payload: any;
  onSubmit: (a: any) => void;
  disabled: boolean;
}) {
  const cards: string[] = payload?.cards ?? [];
  const targets: string[] = payload?.targets ?? [];
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pool, setPool] = useState<string[]>(cards);

  function onDragStart(e: React.DragEvent<HTMLDivElement>, card: string) {
    if (disabled) return;
    e.dataTransfer.setData("text/plain", card);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>, slot: string) {
    if (disabled) return;
    const card = e.dataTransfer.getData("text/plain");
    if (!card) return;
    const newMap = { ...mapping };
    Object.keys(newMap).forEach((k) => {
      if (newMap[k] === card) delete newMap[k];
    });
    newMap[slot] = card;
    setMapping(newMap);
    setPool((cur) => cur.filter((c) => c !== card));
  }

  function onRemove(slot: string) {
    if (disabled) return;
    const c = mapping[slot];
    const nm = { ...mapping };
    delete nm[slot];
    setMapping(nm);
    if (c) setPool((cur) => [...cur, c]);
  }

  return (
    <div className="space-y-4">
      {payload?.help && (
        <p className="text-sm text-gray-600">{payload.help}</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Cartes disponibles */}
        <div className="p-3 rounded-md border bg-white min-h-[120px]">
          <h3 className="font-medium mb-2">Cartes</h3>
          <div className="flex flex-wrap gap-2">
            {pool.map((card) => (
              <div
                key={card}
                draggable={!disabled}
                onDragStart={(e) => onDragStart(e, card)}
                className={`px-3 py-1.5 rounded-md border bg-gray-50 ${
                  disabled ? "opacity-50 cursor-not-allowed" : "cursor-move"
                }`}
              >
                {card}
              </div>
            ))}
          </div>
        </div>

        {/* Slots cibles */}
        <div className="p-3 rounded-md border bg-white">
          <h3 className="font-medium mb-2">Cibles</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {targets.map((slot) => (
              <div
                key={slot}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, slot)}
                className={`border rounded-md p-2 min-h-[46px] bg-gray-50 ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                <div className="text-xs text-gray-600 mb-1">{slot}</div>
                {mapping[slot] ? (
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded bg-white border">
                      {mapping[slot]}
                    </span>
                    <button
                      className="text-xs text-blue-600"
                      onClick={() => onRemove(slot)}
                      disabled={disabled}
                    >
                      retirer
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Déposer ici</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        disabled={disabled}
        onClick={() => onSubmit({ targets: mapping })}
        className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
      >
        Valider
      </button>
    </div>
  );
}

/* ===================== SCHEMA ===================== */
function SchemaUI({
  payload,
  onSubmit,
  disabled,
}: {
  payload: any;
  onSubmit: (a: any) => void;
  disabled: boolean;
}) {
  const nodes: string[] = payload?.nodes ?? [];
  const pairs = useMemo(() => {
    const res: [string, string][] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        res.push([nodes[i], nodes[j]]);
      }
    }
    return res;
  }, [nodes]);

  const [edges, setEdges] = useState<Set<string>>(new Set());
  function toggle(a: string, b: string) {
    const k = keyPair(a, b);
    const s = new Set(edges);
    s.has(k) ? s.delete(k) : s.add(k);
    setEdges(s);
  }

  return (
    <div className="space-y-4">
      {payload?.hint && (
        <p className="text-sm text-gray-600">{payload.hint}</p>
      )}
      <table className="w-full text-sm border">
        <thead>
          <tr>
            <th className="p-2 text-left">Connexion</th>
            <th className="p-2">Inclure ?</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map(([a, b]) => {
            const k = keyPair(a, b);
            const checked = edges.has(k);
            return (
              <tr key={k} className="border-t">
                <td className="p-2">
                  {a} ↔ {b}
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(a, b)}
                    disabled={disabled}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        disabled={disabled}
        onClick={() =>
          onSubmit({ edges: Array.from(edges).map((k) => k.split("|")) })
        }
        className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
      >
        Valider
      </button>
    </div>
  );
}
