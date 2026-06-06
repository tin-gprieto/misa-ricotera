import type { Album } from "../api";

export function filterSingles(
  albums: Record<string, Album[]>,
): Record<string, Album[]> {
  return Object.fromEntries(
    Object.entries(albums).map(([artist, list]) => [
      artist,
      list.filter((a) => a.album_type !== "single"),
    ]),
  );
}

export function filterEnVivo(
  albums: Record<string, Album[]>,
): Record<string, Album[]> {
  return Object.fromEntries(
    Object.entries(albums).map(([artist, list]) => [
      artist,
      list.filter((a) => !a.name.toLowerCase().includes("en vivo")),
    ]),
  );
}
