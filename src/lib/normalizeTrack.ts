import type { TrackFull } from "../api";

export interface Normalization {
  min: number;
  max: number;
}

export function normalizeTrack(track: TrackFull, norm: Normalization): TrackFull {
  if (norm.max === norm.min) return track;
  const normalized = Math.round(
    ((track.popularity - norm.min) / (norm.max - norm.min)) * 100,
  );
  return { ...track, popularity: normalized };
}
