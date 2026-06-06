import { useMemo } from "react";
import type { GameAlbum } from "../../lib/misaGame";

interface Props {
  albums: GameAlbum[];
  rotation: number; // current rotation in degrees
  spinning: boolean;
  facesPerRing?: number;
}

/**
 * A 3D carousel of album covers. The whole ring rotates around the Y axis.
 * `rotation` is controlled by the parent so spins can stop on a chosen album.
 */
export default function AlbumSpinner({
  albums,
  rotation,
  spinning,
  facesPerRing = 8,
}: Props) {
  // pick a stable set of cover images to decorate the ring
  const faces = useMemo(() => {
    const withCover = albums.filter((a) => a.cover);
    const list: GameAlbum[] = [];
    for (let i = 0; i < facesPerRing; i++) {
      list.push(withCover[i % Math.max(1, withCover.length)] ?? albums[0]);
    }
    return list;
  }, [albums, facesPerRing]);

  const radius = 220;
  const step = 360 / facesPerRing;

  return (
    <div className="spinner-stage" aria-hidden="true">
      <div
        className="spinner-ring"
        style={{
          transform: `translateZ(-${radius}px) rotateY(${rotation}deg)`,
          transition: spinning
            ? "transform 3.6s cubic-bezier(0.15, 0.85, 0.2, 1)"
            : "none",
        }}
      >
        {faces.map((album, i) => (
          <div
            key={i}
            className="spinner-face"
            style={{
              transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
            }}
          >
            {album?.cover ? (
              <img src={album.cover} alt="" />
            ) : (
              <div className="spinner-face-empty">♪</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
