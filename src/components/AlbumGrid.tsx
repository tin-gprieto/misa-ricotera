import type { Album } from "../api";
import "./AlbumGrid.css";

interface Props {
  albums: Record<string, Album[]>;
  onSelect: (album: Album) => void;
  excludeSingles: boolean;
  excludeEnVivo: boolean;
  onToggleSingles: () => void;
  onToggleEnVivo: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  album: "Álbum",
  single: "Single",
  compilation: "Compilación",
  ep: "EP",
};

export default function AlbumGrid({
  albums,
  onSelect,
  excludeSingles,
  excludeEnVivo,
  onToggleSingles,
  onToggleEnVivo,
}: Props) {
  const artists = Object.keys(albums);

  return (
    <div className="album-grid-page">
      <h2 className="page-title">Discografía</h2>

      <div className="filter-bar">
        <span className="filter-label">Filtros:</span>
        <button
          className={`filter-btn ${!excludeSingles ? "filter-btn--active" : ""}`}
          onClick={onToggleSingles}
        >
          Singles
        </button>
        <button
          className={`filter-btn ${!excludeEnVivo ? "filter-btn--active" : ""}`}
          onClick={onToggleEnVivo}
        >
          En Vivo
        </button>
      </div>

      {artists.map((artist) => (
        <section key={artist} className="artist-section">
          <h3 className="artist-name">{artist}</h3>
          <p className="album-count">{albums[artist].length} lanzamiento(s)</p>
          <div className="album-grid">
            {albums[artist].map((album) => (
              <button
                key={album.id}
                className="album-card"
                onClick={() => onSelect(album)}
                title={`Ver canciones de ${album.name}`}
              >
                <div className="album-art">
                  {album.images?.[0] ? (
                    <img
                      src={album.images[0].url}
                      alt={album.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="album-art-placeholder">♪</div>
                  )}
                </div>
                <div className="album-info">
                  <span
                    className={`album-type album-type--${album.album_type}`}
                  >
                    {TYPE_LABEL[album.album_type] ?? album.album_type}
                  </span>
                  <p className="album-name">{album.name}</p>
                  <p className="album-meta">
                    {album.release_date.slice(0, 4)} &middot;{" "}
                    {album.total_tracks} canciones
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
