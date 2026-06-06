import type { TrackFull } from "../api";
import { normalizeTrack, type Normalization } from "../lib/normalizeTrack";
import "./TrackDetail.css";

interface Props {
  track: TrackFull;
  normalization: Normalization | null;
  onBack: () => void;
}

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function TrackDetail({ track, normalization, onBack }: Props) {
  const displayTrack = normalization ? normalizeTrack(track, normalization) : track;
  const coverUrl = displayTrack.album.images?.[0]?.url;

  return (
    <div className="detail-page">
      <button className="back-btn" onClick={onBack}>
        ← Volver al álbum
      </button>

      <div className="detail-card">
        <div className="detail-left">
          <div className="detail-cover">
            {coverUrl ? (
              <img src={coverUrl} alt={displayTrack.album.name} />
            ) : (
              <div className="detail-cover-placeholder">♪</div>
            )}
          </div>
          {displayTrack.preview_url && (
            <div className="preview-player">
              <p className="preview-label">Vista previa</p>
              <audio controls src={displayTrack.preview_url} />
            </div>
          )}
        </div>

        <div className="detail-info">
          <p className="detail-artist">
            {displayTrack.artists.map((a) => a.name).join(", ")}
          </p>
          <h2 className="detail-track-name">
            {displayTrack.name}
            {displayTrack.explicit && (
              <span className="explicit-badge" title="Contenido explícito">
                E
              </span>
            )}
          </h2>
          <p className="detail-album">
            {displayTrack.album.name} &middot; {displayTrack.album.release_date.slice(0, 4)}
          </p>

          <div className="detail-stats">
            <div className="stat">
              <span className="stat-label">Duración</span>
              <span className="stat-value">
                {formatDuration(displayTrack.duration_ms)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Pista</span>
              <span className="stat-value">#{displayTrack.track_number}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Popularidad</span>
              <span className="stat-value">{displayTrack.popularity}/100</span>
            </div>
          </div>

          <a
            href={displayTrack.external_urls.spotify}
            target="_blank"
            rel="noreferrer"
            className="spotify-link"
          >
            Escuchar en Spotify ↗
          </a>
        </div>
      </div>
    </div>
  );
}
