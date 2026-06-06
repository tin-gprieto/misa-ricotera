import { fetchAlbums, fetchTracks, fetchNormalization } from "../api";
import type { Album, Track } from "../api";
import { filterSingles, filterEnVivo } from "./filterAlbums";

export type Mode = "easy" | "hard";

export interface GameTrack {
  id: string;
  name: string;
  trackNumber: number;
  popularity: number; // normalized 0-100
  rawPopularity: number; // raw spotify popularity
  albumId: string;
  albumName: string;
  albumYear: string;
  albumCover: string | null;
}

export interface GameAlbum {
  id: string;
  name: string;
  year: string;
  cover: string | null;
  artist: string;
  tracks: GameTrack[];
}

// Internal scoring constants (must NOT be shown to the player)
const MULTIPLIERS = [1.5, 1, 2, 1.5, 1]; // by slot index
const MAX_POPULARITY_SUM = 500;
const MAX_CAPACITY = 400_000;
const NO_JIJIJI_PENALTY = 50_000;
const NO_JIJIJI_CAP = MAX_CAPACITY - 1; // hard ceiling without the winning track
const WIN_POPULARITY_THRESHOLD = 400;
const POGO_SLOT_INDEX = 2;
const WINNING_TRACK = "ji ji ji";

export function slotMultiplier(index: number): number {
  return MULTIPLIERS[index] ?? 1;
}

/** Loads every eligible album (studio albums, no live, no singles) with its tracks. */
export async function loadGameAlbums(): Promise<GameAlbum[]> {
  const [albumsByArtist, norm] = await Promise.all([
    fetchAlbums(),
    fetchNormalization(),
  ]);

  let filtered = filterSingles(albumsByArtist);
  filtered = filterEnVivo(filtered);

  const result: GameAlbum[] = [];
  const seenAlbumNames = new Set<string>();

  for (const [artist, albums] of Object.entries(filtered)) {
    for (const album of albums as Album[]) {
      // avoid duplicate album names (reissues / variants)
      const key = album.name.trim().toLowerCase();
      if (seenAlbumNames.has(key)) continue;

      const rawTracks = await fetchTracks(album.id);
      const tracks = (rawTracks as (Track & { popularity?: number })[])
        .filter((t) => !/en vivo/i.test(t.name))
        .map((t) => {
          const raw = typeof t.popularity === "number" ? t.popularity : 0;
          const normalized =
            norm.max === norm.min
              ? raw
              : Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(((raw - norm.min) / (norm.max - norm.min)) * 100),
                  ),
                );
          return {
            id: t.id,
            name: t.name,
            trackNumber: t.track_number,
            popularity: normalized,
            rawPopularity: raw,
            albumId: album.id,
            albumName: album.name,
            albumYear: album.release_date.slice(0, 4),
            albumCover: album.images?.[0]?.url ?? null,
          } as GameTrack;
        });

      if (tracks.length === 0) continue;
      seenAlbumNames.add(key);

      result.push({
        id: album.id,
        name: album.name,
        year: album.release_date.slice(0, 4),
        cover: album.images?.[0]?.url ?? null,
        artist,
        tracks,
      });
    }
  }

  return result;
}

export function pickRandomAlbum(
  albums: GameAlbum[],
  usedIds: string[],
): GameAlbum | null {
  const available = albums.filter((a) => !usedIds.includes(a.id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export interface ScoreResult {
  attendance: number; // 0 - 400_000
  won: boolean;
}

/** Computes the final attendance from the 5 selected tracks. */
export function computeScore(slots: (GameTrack | null)[]): ScoreResult {
  let popularitySum = 0;
  slots.forEach((track, i) => {
    if (!track) return;
    popularitySum += track.popularity * slotMultiplier(i);
  });

  const ratio = Math.min(1, popularitySum / MAX_POPULARITY_SUM);
  const raw = Math.round(ratio * MAX_CAPACITY);

  const pogoTrack = slots[POGO_SLOT_INDEX];
  const pogoIsJiJiJi =
    !!pogoTrack && pogoTrack.name.trim().toLowerCase().startsWith(WINNING_TRACK);

  const attendance = pogoIsJiJiJi
    ? raw
    : Math.min(NO_JIJIJI_CAP, Math.max(0, raw - NO_JIJIJI_PENALTY));

  const won = pogoIsJiJiJi && popularitySum > WIN_POPULARITY_THRESHOLD;

  return { attendance, won };
}

export const SLOT_LABELS: (string | null)[] = [
  "Apertura",
  null,
  "Pogo más grande del mundo",
  null,
  "Cierre",
];

export const MAX_ATTENDANCE = MAX_CAPACITY;
