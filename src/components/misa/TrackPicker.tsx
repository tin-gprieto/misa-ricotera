import type { GameAlbum, GameTrack, Mode } from "../../lib/misaGame";

function popColor(p: number): string {
  if (p >= 70) return "#2ecc71";
  if (p >= 51) return "#f1c40f";
  return "#e74c3c";
}

interface Props {
  album: GameAlbum;
  mode: Mode;
  selectedIds: string[];
  pendingId?: string;
  onSelect: (track: GameTrack) => void;
  hasFreeSlot: boolean;
}

export default function TrackPicker({
  album,
  mode,
  selectedIds,
  pendingId,
  onSelect,
  hasFreeSlot,
}: Props) {
  return (
    <div>
      <div className="picker-album-head">
        {album.cover ? (
          <img src={album.cover || "/placeholder.svg"} alt={album.name} />
        ) : (
          <div className="spinner-face-empty" style={{ width: 56, height: 56 }}>
            ♪
          </div>
        )}
        <div>
          <p className="picker-album-name">{album.name}</p>
          <p className="picker-album-year">
            {album.artist} · {album.year}
          </p>
        </div>
      </div>

      <ul className="picker-list">
        {album.tracks.map((track) => {
          const selected = selectedIds.includes(track.id);
          const pending = track.id === pendingId;
          const disabled = selected || (!pending && !hasFreeSlot);
          return (
            <li key={track.id}>
              <button
                className={[
                  "picker-track",
                  selected ? "picker-track--selected" : "",
                  pending ? "picker-track--pending" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => onSelect(track)}
                disabled={disabled}
              >
                <span className="picker-track-num">{track.trackNumber}</span>
                <span className="picker-track-name">{track.name}</span>
                {mode === "easy" ? (
                  <span className="picker-pop" title="Popularidad">
                    {track.popularity > 90 && (
                      <span className="picker-pop-star">★</span>
                    )}
                    <span
                      className="picker-pop-num"
                      style={{ color: popColor(track.popularity) }}
                    >
                      {track.popularity}
                    </span>
                  </span>
                ) : (
                  <span className="picker-pop-hidden" title="Popularidad oculta">
                    ?
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {hasFreeSlot ? (
        <p className="picker-cta">
          Elegí una canción para sumarla al setlist
        </p>
      ) : (
        <p className="picker-cta">¡Setlist completo! Listo para la misa.</p>
      )}
    </div>
  );
}
