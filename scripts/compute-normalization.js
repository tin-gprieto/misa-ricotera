#!/usr/bin/env node
// Run from project root: node scripts/compute-normalization.js
// Reads public/data/tracks.json and writes public/data/normalization.json

import { readFileSync, writeFileSync } from "fs";

const tracksData = JSON.parse(readFileSync("public/data/tracks.json", "utf8"));
const allTracks = Object.values(tracksData).flat();

let min = Infinity;
let max = -Infinity;

for (const track of allTracks) {
  if (typeof track.popularity === "number") {
    if (track.popularity < min) min = track.popularity;
    if (track.popularity > max) max = track.popularity;
  }
}

if (!isFinite(min) || !isFinite(max)) {
  console.error("No tracks with popularity values found in tracks.json");
  process.exit(1);
}

writeFileSync(
  "public/data/normalization.json",
  JSON.stringify({ min, max }, null, 2),
);
console.log(`✓  public/data/normalization.json  — min: ${min}, max: ${max}`);
