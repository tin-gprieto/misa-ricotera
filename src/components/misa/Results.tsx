import { useEffect, useRef, useState } from "react";
import type { GameTrack } from "../../lib/misaGame";
import { SLOT_LABELS, MAX_ATTENDANCE } from "../../lib/misaGame";

function popColor(p: number): string {
  if (p >= 67) return "#2ecc71";
  if (p >= 34) return "#f1c40f";
  return "#e74c3c";
}

const STADIUM_SRC =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/pogo-IM4a5TetY4BIJ7zTeWd4yK18P6ZPzh.jpg";

interface Props {
  slots: (GameTrack | null)[];
  attendance: number;
  won: boolean;
  onRestart: () => void;
}

function formatNumber(n: number) {
  return n.toLocaleString("es-AR");
}

function avgPopularity(slots: (GameTrack | null)[]): number {
  const filled = slots.filter(Boolean) as GameTrack[];
  if (filled.length === 0) return 0;
  return Math.round(filled.reduce((sum, t) => sum + t.popularity, 0) / filled.length);
}

export default function Results({ slots, attendance, won, onRestart }: Props) {
  const avg = avgPopularity(slots);
  const [count, setCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const rafRef = useRef<number>(0);

  const fillRatio = Math.min(1, attendance / MAX_ATTENDANCE);

  useEffect(() => {
    const duration = 2400;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * attendance));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // trigger brightness reveal on the next frame
    const revealTimer = setTimeout(() => setRevealed(true), 60);
    rafRef.current = requestAnimationFrame(tick);
    const verdictTimer = setTimeout(() => setShowVerdict(true), 2500);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(revealTimer);
      clearTimeout(verdictTimer);
    };
  }, [attendance]);

  // brightness clip reveals from bottom to top: inset(top% 0 0 0)
  const clipTop = revealed ? (1 - fillRatio) * 100 : 100;
  const glowBottom = revealed ? `${fillRatio * 100}%` : "0%";

  return (
    <div className="misa misa-results">
      <div className="results-stadium">
        <img
          src={STADIUM_SRC || "/placeholder.svg"}
          alt="Estadio durante la misa"
          className="results-stadium-base"
        />
        <img
          src={STADIUM_SRC || "/placeholder.svg"}
          alt=""
          aria-hidden="true"
          className="results-stadium-bright"
          style={{ clipPath: `inset(${clipTop}% 0 0 0)` }}
        />
        <div
          className="results-stadium-glow"
          style={{ bottom: glowBottom, opacity: revealed && fillRatio > 0 ? 1 : 0 }}
        />
        <div className="results-counter">
          <div className="results-count-num">{formatNumber(count)}</div>
          <div className="results-count-label">
            personas en el estadio · meta 400.000
          </div>
        </div>
      </div>

      {showVerdict && (
        <div className={`results-verdict${won ? " results-verdict--win" : ""}`}>
          <h2>
            {won
              ? "¡Estadio lleno! La última misa fue histórica"
              : attendance >= MAX_ATTENDANCE * 0.75
                ? "Casi lo lográs, faltó el ritual perfecto"
                : attendance >= MAX_ATTENDANCE * 0.4
                  ? "Buena convocatoria, pero el aguante pide más"
                  : "La misa quedó a medias"}
          </h2>
          <p>
            Llevaste a <strong>{formatNumber(attendance)}</strong> personas de
            las 400.000 posibles
            {won
              ? ". El pogo más grande del mundo explotó con Ji Ji Ji."
              : "."}
          </p>
        </div>
      )}

      <div className="results-setlist">
        {slots.map((track, i) => (
          <div
            key={i}
            className={`results-row${i === 2 ? " results-row--pogo" : ""}`}
          >
            {track?.albumCover && (
              <img src={track.albumCover || "/placeholder.svg"} alt="" />
            )}
            <div className="results-row-body">
              {SLOT_LABELS[i] && (
                <div className="results-row-label">{SLOT_LABELS[i]}</div>
              )}
              <div className="results-row-track">
                {track ? track.name : "—"}
              </div>
            </div>
            {track && (
              <div className="results-row-pop">
                <span className="picker-pop-bar results-pop-bar">
                  <span
                    className="picker-pop-fill"
                    style={{ width: `${track.popularity}%` }}
                  />
                </span>
                <span
                  className="picker-pop-num"
                  style={{ color: popColor(track.popularity) }}
                >
                  {track.popularity}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="misa-restart-btn" onClick={onRestart}>
        Volver a tocar
      </button>
    </div>
  );
}
