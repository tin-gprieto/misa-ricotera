import { useEffect, useRef, useState } from "react";
import AlbumSpinner from "../components/misa/AlbumSpinner";
import TrackPicker from "../components/misa/TrackPicker";
import Setlist from "../components/misa/Setlist";
import Results from "../components/misa/Results";
import {
  loadGameAlbums,
  pickRandomAlbum,
  computeScore,
  type GameAlbum,
  type GameTrack,
  type Mode,
} from "../lib/misaGame";
import "../components/misa/misa.css";

const STADIUM_SRC =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pogo-IM4a5TetY4BIJ7zTeWd4yK18P6ZPzh.jpg";

type Phase = "intro" | "game" | "results";

const EMPTY_SLOTS: (GameTrack | null)[] = [null, null, null, null, null];

export default function UltimaMisa() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<Mode>("easy");

  const [albums, setAlbums] = useState<GameAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // spinner state
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [currentAlbum, setCurrentAlbum] = useState<GameAlbum | null>(null);
  const [usedAlbumIds, setUsedAlbumIds] = useState<string[]>([]);

  // setlist state
  const [slots, setSlots] = useState<(GameTrack | null)[]>(EMPTY_SLOTS);
  const [pendingTrack, setPendingTrack] = useState<GameTrack | null>(null);

  // results
  const [score, setScore] = useState<{ attendance: number; won: boolean }>({
    attendance: 0,
    won: false,
  });

  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
    };
  }, []);

  const selectedIds = slots.filter(Boolean).map((t) => (t as GameTrack).id);
  const filledCount = slots.filter(Boolean).length;
  const hasFreeSlot = filledCount < 5;
  const allFilled = filledCount === 5;

  async function startGame(selectedMode: Mode) {
    setMode(selectedMode);
    setLoading(true);
    setError(null);
    try {
      const data = await loadGameAlbums();
      setAlbums(data);
      // reset game state
      setSlots(EMPTY_SLOTS);
      setPendingTrack(null);
      setCurrentAlbum(null);
      setUsedAlbumIds([]);
      setRotation(0);
      setPhase("game");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function spin() {
    // can only spin when idle, with albums available, a free slot, and no
    // album currently waiting for its track to be added to the setlist.
    if (spinning || albums.length === 0 || !hasFreeSlot || currentAlbum) return;
    const next = pickRandomAlbum(albums, usedAlbumIds);
    if (!next) return;

    setPendingTrack(null);
    setSpinning(true);

    // Land the chosen album exactly under the top pointer.
    // Each album i sits at angle i*step; it faces front when rotation = -i*step.
    const index = albums.findIndex((a) => a.id === next.id);
    const step = 360 / albums.length;
    const targetBase = (((-index * step) % 360) + 360) % 360;

    setRotation((prev) => {
      const current = ((prev % 360) + 360) % 360;
      const extraTurns = 4 + Math.floor(Math.random() * 3);
      // delta to bring `current` up to `targetBase` going forward, plus full turns
      const delta = (((targetBase - current) % 360) + 360) % 360;
      return prev + extraTurns * 360 + delta;
    });

    spinTimer.current = setTimeout(() => {
      setSpinning(false);
      setCurrentAlbum(next);
      setUsedAlbumIds((ids) => [...ids, next.id]);
    }, 3700);
  }

  function onPickTrack(track: GameTrack) {
    if (!hasFreeSlot) return;
    setPendingTrack(track);
    // auto-place into first empty slot if user prefers, but let them choose
  }

  function assignToSlot(index: number) {
    if (!pendingTrack || slots[index]) return;
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = pendingTrack;
      return copy;
    });
    setPendingTrack(null);
    setCurrentAlbum(null);
  }

  function startSimulation() {
    if (!allFilled) return;
    const result = computeScore(slots);
    setScore(result);
    setPhase("results");
  }

  function restart() {
    setSlots(EMPTY_SLOTS);
    setPendingTrack(null);
    setCurrentAlbum(null);
    setUsedAlbumIds([]);
    setRotation(0);
    setSpinning(false);
    setPhase("game");
  }

  /* ── INTRO ── */
  if (phase === "intro") {
    return (
      <div className="misa misa-intro">
        <div className="misa-stadium">
          <img
            src={STADIUM_SRC || "/placeholder.svg"}
            alt="Multitud en un recital ricotero"
          />
          <div className="misa-stadium-overlay">
            <h1 className="misa-title text-balance">La última misa</h1>
            <p className="misa-subtitle text-pretty">
              Armá el setlist perfecto y convocá a una multitud de hasta{" "}
              <span className="misa-goal">400.000 personas</span>.
            </p>
          </div>
        </div>

        <div className="misa-desc-card">
          <p>
            Sos el encargado de organizar{" "}
            <strong>la última misa ricotera</strong>. Girá la ruleta de discos,
            descubrí qué álbum salió y elegí 5 canciones para que el pueblo
            ricotero no deje de agitar.
          </p>
          <p>
            La apertura, el cierre y sobre todo el{" "}
            <span className="misa-goal">Pogo más grande del mundo</span> son
            decisivos!
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="misa-modes">
          <button
            className="misa-mode-btn misa-mode-btn--easy"
            onClick={() => startGame("easy")}
            disabled={loading}
          >
            <span className="misa-mode-name">Modo fácil</span>
            <span className="misa-mode-hint">
              Vas a ver la popularidad de cada canción.
            </span>
          </button>
          <button
            className="misa-mode-btn misa-mode-btn--hard"
            onClick={() => startGame("hard")}
            disabled={loading}
          >
            <span className="misa-mode-name">Modo difícil</span>
            <span className="misa-mode-hint">
              Sin pistas: elegí a puro instinto ricotero.
            </span>
          </button>
        </div>

        {loading && (
          <div className="loader">
            <div className="spinner" />
            <p>Preparando los discos…</p>
          </div>
        )}
      </div>
    );
  }

  /* ── RESULTS ── */
  if (phase === "results") {
    return (
      <Results
        slots={slots}
        attendance={score.attendance}
        won={score.won}
        onRestart={restart}
      />
    );
  }

  /* ── GAME ── */
  return (
    <div className="misa">
      <div className="misa-gamebar">
        <span className={`misa-mode-pill misa-mode-pill--${mode}`}>
          {mode === "easy" ? "Modo fácil" : "Modo difícil"}
        </span>
        <span className="misa-progress">
          Setlist: <strong>{filledCount}/5</strong>
        </span>
      </div>

      <div className="misa-game-grid">
        <section className="misa-panel">
          <h2 className="misa-panel-title">La ruleta de discos</h2>

          <AlbumSpinner
            albums={albums}
            rotation={rotation}
            spinning={spinning}
          />

          <button
            className="spin-btn"
            onClick={spin}
            disabled={spinning || !hasFreeSlot || !!currentAlbum}
          >
            {spinning
              ? "Girando…"
              : allFilled
                ? "Setlist completo"
                : currentAlbum
                  ? "Elegí y sumá una canción"
                  : "Girar la ruleta"}
          </button>

          {currentAlbum ? (
            <div style={{ marginTop: "1.25rem" }}>
              <TrackPicker
                album={currentAlbum}
                mode={mode}
                selectedIds={selectedIds}
                onSelect={onPickTrack}
                hasFreeSlot={hasFreeSlot}
              />
            </div>
          ) : (
            !spinning && (
              <p className="spinner-hint">
                {allFilled
                  ? "Ya tenés tus 5 canciones. ¡A empezar la misa!"
                  : "Girá la ruleta para descubrir un álbum y elegir una canción."}
              </p>
            )
          )}
        </section>

        <section className="misa-panel">
          <h2 className="misa-panel-title">El setlist</h2>
          {pendingTrack && (
            <p
              className="picker-cta"
              style={{ marginTop: 0, marginBottom: "0.75rem" }}
            >
              «{pendingTrack.name}» lista — elegí un lugar libre del setlist
            </p>
          )}

          <Setlist
            slots={slots}
            pendingTrack={pendingTrack}
            onAssign={assignToSlot}
          />

          <button
            className="misa-start-btn"
            onClick={startSimulation}
            disabled={!allFilled}
          >
            {allFilled
              ? "Empezar la misa"
              : `Faltan ${5 - filledCount} canciones`}
          </button>
        </section>
      </div>
    </div>
  );
}
