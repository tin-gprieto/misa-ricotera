import type { GameAlbum } from "../../lib/misaGame";

interface Props {
  albums: GameAlbum[];
  rotation: number; // current rotation in degrees
  spinning: boolean;
}

/**
 * A 3D carousel of album covers. The whole ring rotates around the Y axis.
 * `rotation` is controlled by the parent so spins stop with the chosen album
 * facing front, directly under the pointer at the top of the stage.
 *
 * The ring renders ONE face per album in a stable order, so the parent can
 * land a specific album under the pointer by setting the rotation to
 * `-index * step` (mod 360).
 */
export default function AlbumSpinner({ albums, rotation, spinning }: Props) {
  const count = Math.max(1, albums.length);
  const step = 360 / count;
  const faceW = 150;
  // radius so faces sit around the ring without crowding
  const radius = Math.max(230, Math.round((faceW * count) / (2 * Math.PI)));

  return (
    <div className="spinner-stage">
      <div className="spinner-pointer" aria-hidden="true" />
      <div className="spinner-perspective">
        <div
          className="spinner-ring"
          style={{
            transform: `translateZ(-${radius}px) rotateY(${rotation}deg)`,
            transition: spinning
              ? "transform 3.6s cubic-bezier(0.15, 0.85, 0.2, 1)"
              : "none",
          }}
        >
          {albums.map((album, i) => (
            <div
              key={album.id}
              className="spinner-face"
              style={{
                transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
              }}
            >
              {album.cover ? (
                <img src={album.cover} alt={album.name} />
              ) : (
                <div className="spinner-face-empty">♪</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
