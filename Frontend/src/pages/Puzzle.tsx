// src/pages/Puzzle.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endpoints } from "../lib/api";
import { useAuth } from "../store/auth";
import type { Puzzle, MediaSpec } from "../types";

// Lottie pour les animations JSON (npm i lottie-react)
import { Player } from "@lottiefiles/react-lottie-player";

const keyPair = (a: string, b: string) => [a, b].sort().join("|");

export default function PuzzlePage() {
  const { id } = useParams<{ id: string }>();
  const pid = Number(id);
  const nav = useNavigate();
  const { token } = useAuth();

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [all, setAll] = useState<Puzzle[]>([]);

  // Charger le puzzle + la liste de la mission
  useEffect(() => {
    (async () => {
      try {
        const puz = (await endpoints.getPuzzle(pid)) as Puzzle;
        setPuzzle(puz);
        const list = (await endpoints.listPuzzlesForMission(
          puz.mission_id
        )) as Puzzle[];
        setAll(list);
      } catch (e: any) {
        alert(e.message || "Impossible de charger la mission.");
        nav("/");
      }
    })();
  }, [pid, nav]);

  // Navigation
  const idx = useMemo(() => all.findIndex((p) => p.id === pid), [all, pid]);
  const prevId = idx > 0 ? all[idx - 1]?.id : undefined;
  const nextId =
    idx >= 0 && idx < all.length - 1 ? all[idx + 1]?.id : undefined;

  async function handleSubmit(answer: unknown) {
    if (!puzzle) return;
    try {
      const res = await endpoints.submitAnswer(
        token ?? null,
        puzzle.id,
        answer
      );
      alert(
        `${res?.correct ? "✅ Correct" : "❌ Incorrect"} — Score: ${
          res?.earned_score
        }${res?.feedback ? " — " + res.feedback : ""}`
      );
      if (nextId) nav(`/puzzles/${nextId}`);
      else nav(`/missions/${puzzle.mission_id}/debrief`);
    } catch (e: any) {
      alert(e.message || "Soumission impossible.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button className="text-sm text-blue-600" onClick={() => nav(-1)}>
            ← Retour
        </button>
        <div className="flex gap-2">
          {prevId && (
            <button className="text-sm px-3 py-1 rounded-md border" onClick={() => nav(`/puzzles/${prevId}`)}>
              ◀ Précédent
            </button>
          )}
          {nextId && (
            <button className="text-sm px-3 py-1 rounded-md border" onClick={() => nav(`/puzzles/${nextId}`)}>
              Suivant ▶
            </button>
          )}
        </div>
      </div>

      {!puzzle ? (
        <div>Chargement…</div>
      ) : (
        <>
          <h1 className="text-2xl font-bold">{puzzle.title}</h1>
          <div className="text-sm text-gray-600">
            Type: {puzzle.type} — Score max: {puzzle.max_score} — {idx + 1}/{all.length}
          </div>

          {/* Bloc animation si payload.media */}
          {puzzle.payload?.media && <AnimationBlock media={puzzle.payload.media as MediaSpec} />}

          {puzzle.type === "QUIZ" && (
            <QuizUI key={puzzle.id} payload={puzzle.payload} onSubmit={handleSubmit} />
          )}

          {puzzle.type === "IMG_QUIZ" && (
            <ImageQuizUI key={puzzle.id} payload={puzzle.payload} onSubmit={handleSubmit} />
          )}

          {puzzle.type === "CODE" && (
            <CodeUI key={puzzle.id} payload={puzzle.payload} onSubmit={handleSubmit} />
          )}

          {puzzle.type === "DND" && (
            <DndUI key={puzzle.id} payload={puzzle.payload} onSubmit={handleSubmit} />
          )}

          {puzzle.type === "SCHEMA" && (
            <SchemaUI key={puzzle.id} payload={puzzle.payload} onSubmit={handleSubmit} />
          )}

          {puzzle.type === "IMG_RECON" && (
            <ImageReconstructUI key={puzzle.id} payload={puzzle.payload} onSubmit={handleSubmit} />
          )}
        </>
      )}
    </div>
  );
}

/* ========= Bloc animation (gif / vidéo / image / lottie) ========= */
function AnimationBlock({ media }: { media: MediaSpec }) {
  const { kind, src, poster, caption, loop = true, autoplay = true, width, height } = media;
  const style = { width: width ?? 560, height: height ?? (kind === "image" || kind === "gif" ? undefined : 315) };

  return (
    <div className="bg-white border rounded-md p-3 my-2">
      {kind === "lottie" && (
        <Player autoplay={autoplay} loop={loop} src={src} style={{ width: style.width, height: style.height }} />
      )}
      {(kind === "gif" || kind === "image") && (
        <img src={src} alt={caption || "media"} width={style.width} height={style.height} className="mx-auto" />
      )}
      {kind === "video" && (
        <video
          src={src}
          poster={poster}
          controls
          muted
          loop={loop}
          autoPlay={autoplay}
          width={style.width}
          height={style.height}
          className="mx-auto rounded-md"
        />
      )}
      {caption && <div className="text-xs text-gray-600 mt-1 text-center">{caption}</div>}
    </div>
  );
}

/* ====================== QUIZ texte ====================== */
function QuizUI({
  payload,
  onSubmit,
}: {
  payload: { question: string; options: string[]; multi?: boolean };
  onSubmit: (a: any) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const multi = Boolean(payload?.multi);
  function toggle(i: number) {
    setSelected((cur) => (multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]));
  }
  return (
    <div className="space-y-4">
      <p className="font-medium">{payload?.question}</p>
      <div className="space-y-2">
        {payload?.options?.map((opt, i) => (
          <label key={i} className="flex items-center gap-2">
            <input type={multi ? "checkbox" : "radio"} name="q" checked={selected.includes(i)} onChange={() => toggle(i)} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      <button onClick={() => onSubmit({ selected })} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90">
        Valider
      </button>
    </div>
  );
}

/* ====================== QUIZ image ====================== */
function ImageQuizUI({
  payload,
  onSubmit,
}: {
  payload: { question: string; options: { label: string; img: string }[]; multi?: boolean };
  onSubmit: (a: any) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const multi = Boolean(payload?.multi);

  function toggle(i: number) {
    setSelected((cur) => (multi ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]));
  }

  return (
    <div className="space-y-3">
      <p className="font-medium">{payload?.question}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {payload?.options?.map((o, i) => {
          const isSel = selected.includes(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`border rounded-md overflow-hidden text-left bg-white hover:shadow ${isSel ? "ring-2 ring-blue-500" : ""}`}
            >
              <img src={o.img} alt={o.label} className="w-full h-40 object-cover" />
              <div className="p-2 text-sm">{o.label}</div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-gray-600">Sélection {multi ? "multiple" : "unique"}.</div>
      <button onClick={() => onSubmit({ selected })} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90">
        Valider
      </button>
    </div>
  );
}

/* ====================== CODE ====================== */
function CodeUI({
  payload,
  onSubmit,
}: {
  payload: { statement?: string };
  onSubmit: (a: any) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="font-medium">{payload?.statement || "Entrez le code/réponse :"} </p>
      <input value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Votre réponse…" />
      <button onClick={() => onSubmit({ text })} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90">
        Valider
      </button>
    </div>
  );
}

/* ======================= DND ====================== */
function DndUI({
  payload,
  onSubmit,
}: {
  payload: { help?: string; cards?: string[]; targets?: string[] };
  onSubmit: (a: any) => void;
}) {
  const cards: string[] = payload?.cards ?? [];
  const targets: string[] = payload?.targets ?? [];
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [pool, setPool] = useState<string[]>(cards);

  function onDragStart(e: React.DragEvent<HTMLDivElement>, card: string) {
    e.dataTransfer.setData("text/plain", card);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>, slot: string) {
    const card = e.dataTransfer.getData("text/plain");
    if (!card) return;
    const m = { ...mapping };
    Object.keys(m).forEach((k) => {
      if (m[k] === card) delete m[k];
    });
    m[slot] = card;
    setMapping(m);
    setPool((cur) => cur.filter((c) => c !== card));
  }
  function onRemove(slot: string) {
    const c = mapping[slot];
    const m = { ...mapping };
    delete m[slot];
    setMapping(m);
    if (c) setPool((cur) => [...cur, c]);
  }

  return (
    <div className="space-y-4">
      {payload?.help && <p className="text-sm text-gray-600">{payload.help}</p>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded-md border bg-white min-h-[120px]">
          <h3 className="font-medium mb-2">Cartes</h3>
          <div className="flex flex-wrap gap-2">
            {pool.map((card) => (
              <div key={card} draggable onDragStart={(e) => onDragStart(e, card)} className="px-3 py-1.5 rounded-md border bg-gray-50 cursor-move">
                {card}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-md border bg-white">
          <h3 className="font-medium mb-2">Cibles</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {targets.map((slot) => (
              <div key={slot} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, slot)} className="border rounded-md p-2 min-h-[46px] bg-gray-50">
                <div className="text-xs text-gray-600 mb-1">{slot}</div>
                {mapping[slot] ? (
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded bg-white border">{mapping[slot]}</span>
                    <button className="text-xs text-blue-600" onClick={() => onRemove(slot)}>retirer</button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Déposer ici</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => onSubmit({ targets: mapping })} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90">
        Valider
      </button>
    </div>
  );
}

/* ===================== SCHEMA ===================== */
function SchemaUI({
  payload,
  onSubmit,
}: {
  payload: { hint?: string; nodes?: string[] };
  onSubmit: (a: any) => void;
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
      {payload?.hint && <p className="text-sm text-gray-600">{payload.hint}</p>}
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
                <td className="p-2">{a} ↔ {b}</td>
                <td className="p-2 text-center">
                  <input type="checkbox" checked={checked} onChange={() => toggle(a, b)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        onClick={() => onSubmit({ edges: Array.from(edges).map((k) => k.split("|")) })}
        className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90"
      >
        Valider
      </button>
    </div>
  );
}

/* =================== IMG_RECON (jigsaw swap) =================== */
function ImageReconstructUI({
  payload,
  onSubmit,
}: {
  payload: { imageUrl: string; rows?: number; cols?: number; size?: number };
  onSubmit: (a: any) => void;
}) {
  const rows = payload?.rows ?? 3;
  const cols = payload?.cols ?? 3;
  const size = payload?.size ?? 300; // taille du puzzle en px
  const n = rows * cols;

  // ordre correct = [0..n-1]
  const solved = useMemo(() => Array.from({ length: n }, (_, i) => i), [n]);

  // initial: permutation mélangée
  const [order, setOrder] = useState<number[]>(() => shuffle(solved));

  function shuffle(arr: number[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function onDragStart(i: number) {
    setDragIndex(i);
  }
  function onDrop(i: number) {
    if (dragIndex === null) return;
    const next = [...order];
    [next[i], next[dragIndex]] = [next[dragIndex], next[i]];
    setOrder(next);
    setDragIndex(null);
  }

  const tileW = Math.floor(size / cols);
  const tileH = Math.floor(size / rows);

  return (
    <div className="space-y-3">
      <div
        className="relative border rounded-md overflow-hidden"
        style={{ width: cols * tileW, height: rows * tileH }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${cols}, ${tileW}px)`, gridTemplateRows: `repeat(${rows}, ${tileH}px)` }}
        >
          {order.map((tileIdx, gridIdx) => {
            const srcX = (tileIdx % cols) * tileW;
            const srcY = Math.floor(tileIdx / cols) * tileH;
            return (
              <div
                key={gridIdx}
                draggable
                onDragStart={() => onDragStart(gridIdx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(gridIdx)}
                className="border border-gray-200"
                style={{
                  width: tileW,
                  height: tileH,
                  backgroundImage: `url(${payload.imageUrl})`,
                  backgroundPosition: `-${srcX}px -${srcY}px`,
                  backgroundSize: `${cols * tileW}px ${rows * tileH}px`,
                  cursor: "move",
                }}
                title="Glisser-déposer pour échanger les pièces"
              />
            );
          })}
        </div>
      </div>
      <div className="text-xs text-gray-600">Astuce : faites glisser une tuile sur une autre pour les échanger.</div>

      <button
        onClick={() => onSubmit({ order })}
        className="px-4 py-2 rounded-md bg-gray-900 text-white hover:opacity-90"
      >
        Valider
      </button>
    </div>
  );
}
