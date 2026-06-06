import type { Album, Track } from "../api";
import "./TrackList.css";

interface Props {
  album: Album;
  tracks: Track[];
  onSelect: (track: Track) => void;
  onBack: () => void;
}

function formatDuration(ms: number) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function TrackList({ album, tracks, onSelect, onBack }: Props) {
  const coverUrl = album.images?.[0]?.url;

  return (
    <div className="tracklist-page">
      <div className="tracklist-header">
        <div className="tracklist-cover">
          {coverUrl ? (
            <img src={coverUrl} alt={album.name} />
          ) : (
            <div className="tracklist-cover-placeholder">♪</div>
          )}
        </div>
        <div className="tracklist-meta">
          <p className="tracklist-artist">
            {album.artists.map((a) => a.name).join(", ")}
          </p>
          <h2 className="tracklist-title">{album.name}</h2>
          <p className="tracklist-sub">
            {album.release_date.slice(0, 4)} &middot; {album.album_type} &middot;{" "}
            {tracks.length} canciones
          </p>
          <button className="back-btn" onClick={onBack}>
            ← Volver
          </button>
        </div>
      </div>

      <div className="tracks">
        <div className="tracks-header-row">
          <span>#</span>
          <span>Canción</span>
          <span>Duración</span>
        </div>
        {tracks.map((track) => (
          <button
            key={track.id}
            className="track-row"
            onClick={() => onSelect(track)}
          >
            <span className="track-num">{track.track_number}</span>
            <span className="track-name">
              {track.name}
              {track.explicit && (
                <span className="explicit-badge" title="Contenido explícito">
                  E
                </span>
              )}
            </span>
            <span className="track-duration">
              {formatDuration(track.duration_ms)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
