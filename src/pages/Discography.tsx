import { useEffect, useState } from "react";
import { fetchAlbums, fetchTracks, fetchTrack, fetchNormalization } from "../api";
import type { Album, Track, TrackFull } from "../api";
import type { Normalization } from "../lib/normalizeTrack";
import { filterSingles, filterEnVivo } from "../lib/filterAlbums";
import AlbumGrid from "../components/AlbumGrid";
import TrackList from "../components/TrackList";
import TrackDetail from "../components/TrackDetail";

type Step = "albums" | "tracks" | "detail";

export default function Discography() {
  const [step, setStep] = useState<Step>("albums");
  const [albums, setAlbums] = useState<Record<string, Album[]> | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<TrackFull | null>(null);
  const [normalization, setNormalization] = useState<Normalization | null>(null);
  const [excludeSingles, setExcludeSingles] = useState(true);
  const [excludeEnVivo, setExcludeEnVivo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAlbums(), fetchNormalization()])
      .then(([albumData, norm]) => {
        setAlbums(albumData);
        setNormalization(norm);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const onAlbumSelect = async (album: Album) => {
    setLoading(true);
    setError(null);
    try {
      const t = await fetchTracks(album.id);
      setSelectedAlbum(album);
      setTracks(t);
      setStep("tracks");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const onTrackSelect = async (track: Track) => {
    setLoading(true);
    setError(null);
    try {
      const t = await fetchTrack(track.id);
      setSelectedTrack(t);
      setStep("detail");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const goToAlbums = () => {
    setStep("albums");
    setSelectedAlbum(null);
    setSelectedTrack(null);
  };

  const goToTracks = () => {
    if (selectedAlbum) {
      setStep("tracks");
      setSelectedTrack(null);
    }
  };

  let displayAlbums = albums;
  if (displayAlbums && excludeSingles) displayAlbums = filterSingles(displayAlbums);
  if (displayAlbums && excludeEnVivo) displayAlbums = filterEnVivo(displayAlbums);

  return (
    <>
      {step !== "albums" && (
        <nav className="disc-breadcrumb" aria-label="Navegación">
          <button className="crumb clickable" onClick={goToAlbums}>
            Discografía
          </button>
          {selectedAlbum && (
            <>
              <span className="crumb-sep">›</span>
              <button
                className={`crumb ${step === "tracks" ? "active" : "clickable"}`}
                onClick={step === "detail" ? goToTracks : undefined}
              >
                {selectedAlbum.name}
              </button>
            </>
          )}
          {step === "detail" && selectedTrack && (
            <>
              <span className="crumb-sep">›</span>
              <span className="crumb active">{selectedTrack.name}</span>
            </>
          )}
        </nav>
      )}

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loader">
          <div className="spinner" />
          <p>Cargando…</p>
        </div>
      ) : (
        !error && (
          <>
            {step === "albums" && displayAlbums && (
              <AlbumGrid
                albums={displayAlbums}
                onSelect={onAlbumSelect}
                excludeSingles={excludeSingles}
                excludeEnVivo={excludeEnVivo}
                onToggleSingles={() => setExcludeSingles((v) => !v)}
                onToggleEnVivo={() => setExcludeEnVivo((v) => !v)}
              />
            )}
            {step === "tracks" && selectedAlbum && (
              <TrackList
                album={selectedAlbum}
                tracks={tracks}
                onSelect={onTrackSelect}
                onBack={goToAlbums}
              />
            )}
            {step === "detail" && selectedTrack && (
              <TrackDetail track={selectedTrack} normalization={normalization} onBack={goToTracks} />
            )}
          </>
        )
      )}
    </>
  );
}
