import type { GameTrack } from "../../lib/misaGame";
import { SLOT_LABELS } from "../../lib/misaGame";

interface Props {
  slots: (GameTrack | null)[];
  pendingTrack: GameTrack | null;
  onAssign: (index: number) => void;
}

export default function Setlist({ slots, pendingTrack, onAssign }: Props) {
  return (
    <ul className="slots">
      {slots.map((track, index) => {
        const isPogo = index === 2;
        const label = SLOT_LABELS[index];
        const targetable = !!pendingTrack && !track;

        return (
          <li
            key={index}
            className={[
              "slot",
              track ? "slot--filled" : "",
              isPogo ? "slot--pogo" : "",
              targetable ? "slot--targetable" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => targetable && onAssign(index)}
            role={targetable ? "button" : undefined}
            tabIndex={targetable ? 0 : undefined}
            onKeyDown={(e) => {
              if (targetable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onAssign(index);
              }
            }}
          >
            <span className="slot-index">{index + 1}</span>

            {track?.albumCover && (
              <img
                className="slot-cover"
                src={track.albumCover || "/placeholder.svg"}
                alt=""
              />
            )}

            <div className="slot-body">
              {label && <p className="slot-label">{label}</p>}
              {track ? (
                <>
                  <p className="slot-track">{track.name}</p>
                  <p className="slot-album">{track.albumName}</p>
                </>
              ) : (
                <p className="slot-empty-text">
                  {targetable
                    ? "Tocá para colocar la canción aquí"
                    : "Vacío"}
                </p>
              )}
            </div>

            {track && (
              <a
                className="slot-spotify"
                href={`https://open.spotify.com/track/${track.id}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Escuchar ${track.name} en Spotify`}
                title="Abrir en Spotify"
                onClick={(e) => e.stopPropagation()}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
