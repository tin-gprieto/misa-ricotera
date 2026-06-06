import type { GameTrack } from "../../lib/misaGame";
import { SLOT_LABELS } from "../../lib/misaGame";

interface Props {
  slots: (GameTrack | null)[];
  pendingTrack: GameTrack | null;
  onAssign: (index: number) => void;
  onRemove: (index: number) => void;
}

export default function Setlist({
  slots,
  pendingTrack,
  onAssign,
  onRemove,
}: Props) {
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
              <button
                className="slot-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                aria-label="Quitar canción"
                title="Quitar"
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
