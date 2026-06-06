export interface Artist {
  id: string;
  name: string;
  external_urls: { spotify: string };
}

export interface Album {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  artists: Artist[];
  external_urls: { spotify: string };
  images: { url: string; height: number; width: number }[];
}

export interface Track {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
  explicit: boolean;
  artists: Artist[];
  external_urls: { spotify: string };
  preview_url: string | null;
}

export interface TrackFull extends Track {
  album: Album;
  popularity: number;
}

export interface AlbumFilters {
  excludeEnVivo?: boolean;
  excludeSingles?: boolean;
}

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

let tracksCache: Record<string, TrackFull[]> | null = null;

async function getTracksData(): Promise<Record<string, TrackFull[]>> {
  if (!tracksCache)
    tracksCache = await loadJson<Record<string, TrackFull[]>>("/data/tracks.json");
  return tracksCache;
}

export const fetchAlbums = async (
  filters?: AlbumFilters,
): Promise<Record<string, Album[]>> => {
  const data = await loadJson<Record<string, Album[]>>("/data/albums.json");
  if (!filters?.excludeEnVivo && !filters?.excludeSingles) return data;
  return Object.fromEntries(
    Object.entries(data).map(([artist, albums]) => [
      artist,
      albums.filter((a) => {
        if (filters.excludeEnVivo && a.name.includes("En Vivo")) return false;
        if (filters.excludeSingles && a.album_type === "single") return false;
        return true;
      }),
    ]),
  );
};

export const fetchTracks = async (albumId: string): Promise<Track[]> => {
  const data = await getTracksData();
  return data[albumId] ?? [];
};

export const fetchNormalization = async (): Promise<{ min: number; max: number }> => {
  return loadJson("/data/normalization.json");
};

export const fetchTrack = async (trackId: string): Promise<TrackFull> => {
  const data = await getTracksData();
  for (const tracks of Object.values(data)) {
    const found = tracks.find((t) => t.id === trackId);
    if (found) return found;
  }
  throw new Error(`Track not found: ${trackId}`);
};
