#!/usr/bin/env node
// Run from project root: node scripts/fetch-data.js
// Reads SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET from .env
// Writes public/data/albums.json and public/data/tracks.json

import { readFileSync, writeFileSync, mkdirSync } from "fs";

try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env");
  process.exit(1);
}

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const ARTISTS = ["Indio Solari", "Patricio Rey y sus Redonditos de Ricota"];
const OUT = "public/data";

async function getToken() {
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const { access_token } = await res.json();
  return access_token;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, token) {
  await sleep(200);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${url}`);
  return res.json();
}

async function paginate(url, token) {
  const items = [];
  let next = url;
  while (next) {
    const page = await get(next, token);
    items.push(...page.items);
    next = page.next;
  }
  return items;
}

async function main() {
  const token = await getToken();
  // const token = "";

  // ── 1. Albums ────────────────────────────────────────────────────────────
  const albumsByArtist = {};
  for (const artistName of ARTISTS) {
    console.log(`Fetching albums for "${artistName}"…`);
    const q = encodeURIComponent(`artist:${artistName}`);
    const search = await get(`${API}/search?q=${q}&type=artist&limit=5`, token);
    const artist = search.artists.items.find(
      (a) => a.name.toLowerCase() === artistName.toLowerCase(),
    );
    if (!artist) throw new Error(`Artist not found: ${artistName}`);

    const albums = await paginate(
      `${API}/artists/${artist.id}/albums?include_groups=album,single,compilation&limit=50`,
      token,
    );
    albumsByArtist[artistName] = albums;
    console.log(`  → ${albums.length} albums`);
  }

  // ── 2. Track IDs per album ────────────────────────────────────────────────
  const allAlbums = Object.values(albumsByArtist).flat();
  const albumTrackIds = {};

  for (const album of allAlbums) {
    process.stdout.write(`Fetching track list for "${album.name}"… `);
    const tracks = await paginate(
      `${API}/albums/${album.id}/tracks?limit=50`,
      token,
    );
    albumTrackIds[album.id] = tracks.map((t) => t.id);
    console.log(`${tracks.length} tracks`);
  }

  // ── 3. Batch-fetch full track info (50 per request) ──────────────────────
  const allIds = [...new Set(Object.values(albumTrackIds).flat())];
  console.log(
    `\nFetching full info for ${allIds.length} tracks in batches of 50…`,
  );

  const trackMap = {};
  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50);
    const { tracks } = await get(`${API}/tracks?ids=${batch.join(",")}`, token);
    for (const t of tracks) {
      if (t) trackMap[t.id] = t;
    }
    console.log(`  ${Math.min(i + 50, allIds.length)}/${allIds.length}`);
  }

  // ── 4. Organize tracks by album ───────────────────────────────────────────
  const tracksByAlbum = {};
  for (const [albumId, ids] of Object.entries(albumTrackIds)) {
    tracksByAlbum[albumId] = ids.map((id) => trackMap[id]).filter(Boolean);
  }

  // ── 5. Write output ───────────────────────────────────────────────────────
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/albums.json`, JSON.stringify(albumsByArtist, null, 2));
  writeFileSync(`${OUT}/tracks.json`, JSON.stringify(tracksByAlbum, null, 2));

  const totalTracks = Object.values(tracksByAlbum).flat().length;
  console.log(`\n✓  ${OUT}/albums.json  — ${allAlbums.length} albums`);
  console.log(`✓  ${OUT}/tracks.json  — ${totalTracks} tracks`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
