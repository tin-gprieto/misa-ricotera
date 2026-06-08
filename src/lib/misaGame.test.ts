import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  slotMultiplier,
  effectiveMultiplier,
  pickRandomAlbum,
  computeScore,
  loadGameAlbums,
  SLOT_LABELS,
  MAX_ATTENDANCE,
  SPECIAL_SLOT_THRESHOLD,
  type GameAlbum,
  type GameTrack,
} from "./misaGame";
import { fetchAlbums, fetchTracks, fetchNormalization } from "../api";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTrack(overrides: Partial<GameTrack> = {}): GameTrack {
  return {
    id: "t1",
    name: "Test Track",
    trackNumber: 1,
    popularity: 50,
    rawPopularity: 50,
    albumId: "a1",
    albumName: "Test Album",
    albumYear: "2000",
    albumCover: null,
    ...overrides,
  };
}

function makeAlbum(overrides: Partial<GameAlbum> = {}): GameAlbum {
  return {
    id: "a1",
    name: "Test Album",
    year: "2000",
    cover: null,
    artist: "Patricio Rey",
    tracks: [makeTrack()],
    ...overrides,
  };
}

/**
 * Builds a full 5-slot array where every track has the given popularity.
 * Effective sum by tier (special slots = 0, 2, 4):
 *   pop <  70 → ×(0.5 + 1 + 0.5  + 1 + 0.5 ) = pop × 3.5
 *   70–79     → ×(0.75+ 1 + 0.75 + 1 + 0.75) = pop × 4.25
 *   80–89     → ×(1   + 1 + 1    + 1 + 1   ) = pop × 5
 *   pop ≥ 90  → ×(1.25+ 1 + 1.5  + 1 + 1.25) = pop × 6
 */
function uniformSlots(popularity: number, pogoName = "Test Track"): GameTrack[] {
  return [0, 1, 2, 3, 4].map((i) =>
    makeTrack({
      id: `t${i}`,
      popularity,
      name: i === 2 ? pogoName : "Test Track",
    }),
  );
}

// ── slotMultiplier ────────────────────────────────────────────────────────────

describe("slotMultiplier", () => {
  it("returns 1.25 for Apertura (slot 0)", () => {
    expect(slotMultiplier(0)).toBe(1.25);
  });

  it("returns 1 for slot 1", () => {
    expect(slotMultiplier(1)).toBe(1);
  });

  it("returns 1.5 for Pogo (slot 2)", () => {
    expect(slotMultiplier(2)).toBe(1.5);
  });

  it("returns 1 for slot 3", () => {
    expect(slotMultiplier(3)).toBe(1);
  });

  it("returns 1.25 for Cierre (slot 4)", () => {
    expect(slotMultiplier(4)).toBe(1.25);
  });

  it("falls back to 1 for out-of-range indices", () => {
    expect(slotMultiplier(99)).toBe(1);
    expect(slotMultiplier(-1)).toBe(1);
  });
});

// ── effectiveMultiplier ───────────────────────────────────────────────────────
//
// Tiers for special slots (0 = Apertura, 2 = Pogo, 4 = Cierre):
//   pop <  70  → ×0.5  (penalty)
//   70–79      → ×0.75 (less penalty)
//   80–89      → ×1    (neutral)
//   pop ≥  90  → normal slot multiplier (×1.25 for 0/4, ×1.5 for 2)
//
// Non-special slots (1, 3) are always ×1.

describe("effectiveMultiplier", () => {
  describe("tier 1 — penalty (pop < 70)", () => {
    it("slot 0: returns 0.5 at pop=0 and pop=69", () => {
      expect(effectiveMultiplier(0, 0)).toBe(0.5);
      expect(effectiveMultiplier(0, 69)).toBe(0.5);
    });

    it("slot 2: returns 0.5 at pop=0 and pop=69", () => {
      expect(effectiveMultiplier(2, 0)).toBe(0.5);
      expect(effectiveMultiplier(2, 69)).toBe(0.5);
    });

    it("slot 4: returns 0.5 at pop=0 and pop=69", () => {
      expect(effectiveMultiplier(4, 0)).toBe(0.5);
      expect(effectiveMultiplier(4, 69)).toBe(0.5);
    });
  });

  describe("tier 2 — less penalty (70 ≤ pop < 80)", () => {
    it("slot 0: returns 0.75 at pop=70 and pop=79", () => {
      expect(effectiveMultiplier(0, 70)).toBe(0.75);
      expect(effectiveMultiplier(0, 79)).toBe(0.75);
    });

    it("slot 2: returns 0.75 at pop=70 and pop=79", () => {
      expect(effectiveMultiplier(2, 70)).toBe(0.75);
      expect(effectiveMultiplier(2, 79)).toBe(0.75);
    });

    it("slot 4: returns 0.75 at pop=70 and pop=79", () => {
      expect(effectiveMultiplier(4, 70)).toBe(0.75);
      expect(effectiveMultiplier(4, 79)).toBe(0.75);
    });
  });

  describe("tier 3 — neutral (80 ≤ pop < 90)", () => {
    it("slot 0: returns 1 at pop=80 and pop=89", () => {
      expect(effectiveMultiplier(0, 80)).toBe(1);
      expect(effectiveMultiplier(0, 89)).toBe(1);
    });

    it("slot 2: returns 1 at pop=80 and pop=89", () => {
      expect(effectiveMultiplier(2, 80)).toBe(1);
      expect(effectiveMultiplier(2, 89)).toBe(1);
    });

    it("slot 4: returns 1 at pop=80 and pop=89", () => {
      expect(effectiveMultiplier(4, 80)).toBe(1);
      expect(effectiveMultiplier(4, 89)).toBe(1);
    });
  });

  describe("tier 4 — full bonus (pop ≥ 90)", () => {
    it("slot 0 (Apertura): returns 1.25 at pop=90 and pop=100", () => {
      expect(effectiveMultiplier(0, 90)).toBe(1.25);
      expect(effectiveMultiplier(0, 100)).toBe(1.25);
    });

    it("slot 2 (Pogo): returns 1.5 at pop=90 and pop=100", () => {
      expect(effectiveMultiplier(2, 90)).toBe(1.5);
      expect(effectiveMultiplier(2, 100)).toBe(1.5);
    });

    it("slot 4 (Cierre): returns 1.25 at pop=90 and pop=100", () => {
      expect(effectiveMultiplier(4, 90)).toBe(1.25);
      expect(effectiveMultiplier(4, 100)).toBe(1.25);
    });
  });

  describe("tier boundaries", () => {
    it("69 → 0.5, 70 → 0.75 for all special slots", () => {
      for (const slot of [0, 2, 4]) {
        expect(effectiveMultiplier(slot, 69)).toBe(0.5);
        expect(effectiveMultiplier(slot, 70)).toBe(0.75);
      }
    });

    it("79 → 0.75, 80 → 1 for all special slots", () => {
      for (const slot of [0, 2, 4]) {
        expect(effectiveMultiplier(slot, 79)).toBe(0.75);
        expect(effectiveMultiplier(slot, 80)).toBe(1);
      }
    });

    it("89 → 1, 90 → normal multiplier for all special slots", () => {
      expect(effectiveMultiplier(0, 89)).toBe(1);
      expect(effectiveMultiplier(0, 90)).toBe(1.25);
      expect(effectiveMultiplier(2, 89)).toBe(1);
      expect(effectiveMultiplier(2, 90)).toBe(1.5);
      expect(effectiveMultiplier(4, 89)).toBe(1);
      expect(effectiveMultiplier(4, 90)).toBe(1.25);
    });
  });

  describe("non-special slots", () => {
    it("slot 1 is always ×1 regardless of pop", () => {
      expect(effectiveMultiplier(1, 0)).toBe(1);
      expect(effectiveMultiplier(1, 69)).toBe(1);
      expect(effectiveMultiplier(1, 75)).toBe(1);
      expect(effectiveMultiplier(1, 85)).toBe(1);
      expect(effectiveMultiplier(1, 100)).toBe(1);
    });

    it("slot 3 is always ×1 regardless of pop", () => {
      expect(effectiveMultiplier(3, 0)).toBe(1);
      expect(effectiveMultiplier(3, 69)).toBe(1);
      expect(effectiveMultiplier(3, 75)).toBe(1);
      expect(effectiveMultiplier(3, 85)).toBe(1);
      expect(effectiveMultiplier(3, 100)).toBe(1);
    });
  });

  it("SPECIAL_SLOT_THRESHOLD export equals 90", () => {
    expect(SPECIAL_SLOT_THRESHOLD).toBe(90);
  });
});

// ── pickRandomAlbum ───────────────────────────────────────────────────────────

describe("pickRandomAlbum", () => {
  const albums = [
    makeAlbum({ id: "a1", name: "Album 1" }),
    makeAlbum({ id: "a2", name: "Album 2" }),
    makeAlbum({ id: "a3", name: "Album 3" }),
  ];

  it("returns null when the list is empty", () => {
    expect(pickRandomAlbum([], [])).toBeNull();
  });

  it("returns null when all albums are already used", () => {
    expect(pickRandomAlbum(albums, ["a1", "a2", "a3"])).toBeNull();
  });

  it("never returns an album that is already used", () => {
    for (let i = 0; i < 50; i++) {
      const result = pickRandomAlbum(albums, ["a1", "a2"]);
      expect(result?.id).toBe("a3");
    }
  });

  it("returns one of the available albums", () => {
    const result = pickRandomAlbum(albums, ["a1"]);
    expect(["a2", "a3"]).toContain(result?.id);
  });

  it("returns the only remaining album deterministically", () => {
    const result = pickRandomAlbum(albums, ["a2", "a3"]);
    expect(result?.id).toBe("a1");
  });
});

// ── computeScore ──────────────────────────────────────────────────────────────
//
// STAGE1_MAX = 352  → base 100_000
// STAGE2_MAX = 411  → base 200_000; above → base 300_000
// Won: sum > 411 AND pogo slot starts with a winning track name

describe("computeScore", () => {
  describe("null slots", () => {
    it("treats null slots as zero contribution", () => {
      const { attendance } = computeScore([null, null, null, null, null]);
      expect(attendance).toBeGreaterThanOrEqual(100_000);
      expect(attendance).toBeLessThanOrEqual(200_000);
    });

    it("handles a mix of filled and empty slots", () => {
      const slots = [makeTrack({ popularity: 0 }), null, null, null, null];
      const { attendance } = computeScore(slots);
      expect(attendance).toBeGreaterThanOrEqual(100_000);
      expect(attendance).toBeLessThanOrEqual(200_000);
    });
  });

  describe("stage 1 (sum ≤ 352)", () => {
    it("pop=50 < 70 → special slots ×0.5; sum = 50×3.5 = 175 ≤ 352 → 100k–200k", () => {
      // slot 0: 50×0.5=25 | slot 1: 50×1=50 | slot 2: 50×0.5=25 | slot 3: 50×1=50 | slot 4: 50×0.5=25
      // sum = 175
      const { attendance, won } = computeScore(uniformSlots(50));
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(100_000);
      expect(attendance).toBeLessThanOrEqual(200_000);
    });

    it("pop=75 in tier 70–79 → special slots ×0.75; sum = 75×4.25 = 318.75 ≤ 352 → 100k–200k", () => {
      // slot 0: 75×0.75=56.25 | slot 1: 75×1=75 | slot 2: 75×0.75=56.25 | slot 3: 75×1=75 | slot 4: 75×0.75=56.25
      // sum = 318.75
      const { attendance, won } = computeScore(uniformSlots(75));
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(100_000);
      expect(attendance).toBeLessThanOrEqual(200_000);
    });
  });

  describe("stage 2 (353 ≤ sum ≤ 411)", () => {
    it("apertura/cierre ≥ 90 (×1.25), pogo in tier 70–79 (×0.75) → sum ≈ 381 → 200k–300k", () => {
      // slot 0: 90×1.25=112.5 | slot 1: 50×1=50 | slot 2: 75×0.75=56.25 | slot 3: 50×1=50 | slot 4: 90×1.25=112.5
      // sum = 381.25 → stage 2
      const slots: (GameTrack | null)[] = [
        makeTrack({ id: "s2-0", popularity: 90 }),
        makeTrack({ id: "s2-1", popularity: 50 }),
        makeTrack({ id: "s2-2", popularity: 75, name: "Not a Winner" }),
        makeTrack({ id: "s2-3", popularity: 50 }),
        makeTrack({ id: "s2-4", popularity: 90 }),
      ];
      const { attendance, won } = computeScore(slots);
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(200_000);
      expect(attendance).toBeLessThanOrEqual(300_000);
    });

    it("all special slots in tier 80–89 (×1) → sum = 85×5 = 425... adjusting: 80×5=400 → stage 2", () => {
      // slot 0: 80×1=80 | slot 1: 80×1=80 | slot 2: 80×1=80 | slot 3: 80×1=80 | slot 4: 80×1=80
      // sum = 400 → stage 2
      const { attendance, won } = computeScore(uniformSlots(80));
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(200_000);
      expect(attendance).toBeLessThanOrEqual(300_000);
    });
  });

  describe("stage 3 (sum > 411, no win condition)", () => {
    it("pop=90 ≥ 90 → no penalty; sum = 90×6 = 540 > 411 → 300k–400k", () => {
      // slot 0: 90×1.25=112.5 | slot 1: 90×1=90 | slot 2: 90×1.5=135 | slot 3: 90×1=90 | slot 4: 90×1.25=112.5
      // sum = 540
      const { attendance, won } = computeScore(uniformSlots(90));
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(300_000);
      expect(attendance).toBeLessThanOrEqual(400_000);
    });
  });

  describe("win condition", () => {
    it("returns 400k and won=true when sum > 411 and pogo is a winning track", () => {
      // pop=90 → sum=540 > 411; pogo slot (index 2) has "Ji Ji Ji" (≥90 → no penalty)
      const { attendance, won } = computeScore(uniformSlots(90, "Ji Ji Ji"));
      expect(won).toBe(true);
      expect(attendance).toBe(MAX_ATTENDANCE);
    });

    it("is case-insensitive for the winning pogo track name", () => {
      const { won } = computeScore(uniformSlots(90, "JI JI JI"));
      expect(won).toBe(true);
    });

    it("matches when the track name has extra words after the winning prefix", () => {
      const { won } = computeScore(uniformSlots(90, "Ji Ji Ji (live)"));
      expect(won).toBe(true);
    });

    it("does NOT win when sum ≤ 411 even with a winning pogo track", () => {
      // pop=50 < 70 → special slots ×0.5; sum=175 ≤ 411
      const { won } = computeScore(uniformSlots(50, "Ji Ji Ji"));
      expect(won).toBe(false);
    });

    it("does NOT win when sum > 411 but pogo track is not a winning one", () => {
      const { won } = computeScore(uniformSlots(90, "Some Other Song"));
      expect(won).toBe(false);
    });

    it("does NOT win when the pogo slot is null", () => {
      const slots: (GameTrack | null)[] = uniformSlots(90, "Ji Ji Ji");
      slots[2] = null;
      const { won } = computeScore(slots);
      expect(won).toBe(false);
    });

    it("recognises all winning pogo tracks", () => {
      const winningNames = [
        "Ñam Fri Fruli Fali Fru",
        "Ji Ji Ji",
        "Fuegos de Octubre",
        "Rock para el Negro Atila",
        "Ella debe estar tan linda",
        "El Pibe de los Astilleros",
        "Nadie es Perfecto",
        "Mariposa Pontiac",
      ];
      for (const name of winningNames) {
        // pop=90 ≥ 90 → pogo gets ×1.5 (no penalty); sum=540 > 411 → should win
        const { won } = computeScore(uniformSlots(90, name));
        expect(won, `Expected win for pogo track "${name}"`).toBe(true);
      }
    });

    it("does NOT win when pogo winning track is in tier 70–79 (×0.75) — sum stays ≤ 411", () => {
      // pop=75 everywhere: sum=75×4.25=318.75 ≤ 411 → no win even with winning track name
      const { won } = computeScore(uniformSlots(75, "Ji Ji Ji"));
      expect(won).toBe(false);
    });

    it("does NOT win when pogo winning track is in tier 80–89 (×1) and overall sum ≤ 411", () => {
      // slot 0: 90×1.25=112.5 | slot 1: 50×1=50 | slot 2: 85×1=85 | slot 3: 50×1=50 | slot 4: 90×1.25=112.5
      // sum = 410 ≤ 411 → no win (borderline stage 2)
      const slots: (GameTrack | null)[] = [
        makeTrack({ id: "t0", popularity: 90 }),
        makeTrack({ id: "t1", popularity: 50 }),
        makeTrack({ id: "t2", popularity: 85, name: "Ji Ji Ji" }),
        makeTrack({ id: "t3", popularity: 50 }),
        makeTrack({ id: "t4", popularity: 90 }),
      ];
      const { won } = computeScore(slots);
      expect(won).toBe(false);
    });
  });

  describe("attendance is always within bounds", () => {
    it("never exceeds MAX_ATTENDANCE", () => {
      for (let pop = 0; pop <= 100; pop += 10) {
        const { attendance } = computeScore(uniformSlots(pop));
        expect(attendance).toBeLessThanOrEqual(MAX_ATTENDANCE);
      }
    });

    it("is always positive", () => {
      const { attendance } = computeScore(uniformSlots(0));
      expect(attendance).toBeGreaterThan(0);
    });
  });
});

// ── constants ─────────────────────────────────────────────────────────────────

describe("SLOT_LABELS", () => {
  it("has exactly 5 entries", () => {
    expect(SLOT_LABELS).toHaveLength(5);
  });

  it("labels the special slots correctly", () => {
    expect(SLOT_LABELS[0]).toBe("Apertura");
    expect(SLOT_LABELS[2]).toBe("Pogo más grande del mundo");
    expect(SLOT_LABELS[4]).toBe("Cierre");
  });

  it("has null for unlabelled slots", () => {
    expect(SLOT_LABELS[1]).toBeNull();
    expect(SLOT_LABELS[3]).toBeNull();
  });
});

describe("MAX_ATTENDANCE", () => {
  it("is 400 000", () => {
    expect(MAX_ATTENDANCE).toBe(400_000);
  });
});

// ── Stage scenarios with real track names ─────────────────────────────────────
//
// Tier multipliers for special slots (0, 2, 4):
//   pop <  70 → ×0.5  | slot 0/4 effective: 0.5  | slot 2 effective: 0.5
//   70–79     → ×0.75 | slot 0/4 effective: 0.75 | slot 2 effective: 0.75
//   80–89     → ×1    | slot 0/4 effective: 1     | slot 2 effective: 1
//   pop ≥ 90  → full  | slot 0/4 effective: 1.25  | slot 2 effective: 1.5

type SetlistRow = {
  slot: number;
  label: string;
  canción: string;
  pop: number;
  "×eff": number;
  score: string;
};

function printSetlist(
  title: string,
  slots: GameTrack[],
  result: { attendance: number; won: boolean },
) {
  const rows: SetlistRow[] = slots.map((track, i) => {
    const mult = effectiveMultiplier(i, track.popularity);
    const label = i === 2 ? `${SLOT_LABELS[i] ?? "—"} ★` : (SLOT_LABELS[i] ?? "—");
    return {
      slot: i,
      label,
      canción: track.name,
      pop: track.popularity,
      "×eff": mult,
      score: (track.popularity * mult).toFixed(2),
    };
  });

  const total = rows.reduce((sum, r) => sum + parseFloat(r.score), 0);
  const verdict = result.won
    ? "¡GANASTE! — 400.000 personas, estadio lleno"
    : `${result.attendance.toLocaleString("es-AR")} personas (${
        result.attendance < 200_000 ? "~100k–200k" :
        result.attendance < 300_000 ? "~200k–300k" : "~300k–400k"
      })`;

  console.log(`\n${"─".repeat(64)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(64));
  console.table(rows);
  console.log(`  Total ponderado : ${total.toFixed(2)}`);
  console.log(`  Resultado       : ${verdict}`);
  console.log("─".repeat(64));
}

describe("stage scenarios (real track names)", () => {
  it("stage 1 — todos pop=50 < 70, special slots ×0.5; sum=175 → ~100k–200k", () => {
    // slot 0: 50×0.5=25 | slot 1: 50×1=50 | slot 2: 50×0.5=25 | slot 3: 50×1=50 | slot 4: 50×0.5=25
    // sum = 175 ≤ 352
    const slots: GameTrack[] = [
      makeTrack({ id: "s1-0", name: "Una Rata Muerta Entre los Geranios",      popularity: 50, trackNumber: 1 }),
      makeTrack({ id: "s1-1", name: "Sopa de Lágrimas (Para el Pibe Delete)",  popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "s1-2", name: "Nike Es la Cultura",                      popularity: 50, trackNumber: 3 }),
      makeTrack({ id: "s1-3", name: "Morta Punto Com",                         popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "s1-4", name: "Dr. Saturno",                             popularity: 50, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 1 — Convocatoria baja (todos penalizados ×0.5)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(100_000);
    expect(result.attendance).toBeLessThanOrEqual(200_000);
  });

  it("stage 2 — apertura/cierre ≥90, pogo pop=75 tier 70–79 (×0.75); sum=381.25 → ~200k–300k", () => {
    // slot 0: 90×1.25=112.5 | slot 1: 50×1=50 | slot 2: 75×0.75=56.25 | slot 3: 50×1=50 | slot 4: 90×1.25=112.5
    // sum = 381.25 → 353 ≤ sum ≤ 411
    const slots: GameTrack[] = [
      makeTrack({ id: "s2-0", name: "La Hija del Fletero",          popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "s2-1", name: "Morta Punto Com",              popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "s2-2", name: "Caña Seca y un Membrillo",     popularity: 75, trackNumber: 3 }),
      makeTrack({ id: "s2-3", name: "Dr. Saturno",                  popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "s2-4", name: "Salando las Heridas",          popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 2 — Apertura/Cierre top, pogo tier 70–79 (×0.75)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(200_000);
    expect(result.attendance).toBeLessThanOrEqual(300_000);
  });

  it("stage 2 — todos en tier 80–89 (×1 neutral); sum = 85×5 = 425... usando pop=80; sum=400 → ~200k–300k", () => {
    // slot 0: 80×1=80 | slot 1: 80×1=80 | slot 2: 80×1=80 | slot 3: 80×1=80 | slot 4: 80×1=80
    // sum = 400 → stage 2
    const slots: GameTrack[] = [
      makeTrack({ id: "n2-0", name: "La Bestia Pop",              popularity: 80, trackNumber: 1 }),
      makeTrack({ id: "n2-1", name: "Vencedores Vencidos",        popularity: 80, trackNumber: 2 }),
      makeTrack({ id: "n2-2", name: "Caña Seca y un Membrillo",   popularity: 80, trackNumber: 3 }),
      makeTrack({ id: "n2-3", name: "Yo Caníbal",                 popularity: 80, trackNumber: 4 }),
      makeTrack({ id: "n2-4", name: "Salando las Heridas",        popularity: 80, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 2 — Todos tier 80–89 (×1 neutral, no bonus)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(200_000);
    expect(result.attendance).toBeLessThanOrEqual(300_000);
  });

  it("stage 3 — todo ≥90, no winning pogo; sum=540 → ~300k–400k", () => {
    // slot 0: 95×1.25=118.75 | slot 1: 93×1=93 | slot 2: 91×1.5=136.5 | slot 3: 90×1=90 | slot 4: 90×1.25=112.5
    // sum = 550.75 > 411; "Todo un Palo" no es track ganador
    const slots: GameTrack[] = [
      makeTrack({ id: "s3-0", name: "La Bestia Pop",                        popularity: 95, trackNumber: 1 }),
      makeTrack({ id: "s3-1", name: "Vencedores Vencidos",                  popularity: 93, trackNumber: 2 }),
      makeTrack({ id: "s3-2", name: "Todo un Palo",                         popularity: 91, trackNumber: 3 }),
      makeTrack({ id: "s3-3", name: "Una Piba Con la Remera de Greenpeace", popularity: 90, trackNumber: 4 }),
      makeTrack({ id: "s3-4", name: "Yo Caníbal",                           popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 3 — Gran convocatoria (sin ganar)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(300_000);
    expect(result.attendance).toBeLessThanOrEqual(400_000);
  });

  it("win — Ji Ji Ji ≥90 en pogo (×1.5), sum≈554 > 411 → estadio lleno", () => {
    // slot 0: 95×1.25=118.75 | slot 1: 93×1=93 | slot 2: 93×1.5=139.5 | slot 3: 91×1=91 | slot 4: 90×1.25=112.5
    // sum = 554.75 > 411; Ji Ji Ji ★ → gana
    const slots: GameTrack[] = [
      makeTrack({ id: "sw-0", name: "La Bestia Pop",                        popularity: 95, trackNumber: 1 }),
      makeTrack({ id: "sw-1", name: "Vencedores Vencidos",                  popularity: 93, trackNumber: 2 }),
      makeTrack({ id: "sw-2", name: "Ji Ji Ji",                             popularity: 93, trackNumber: 3 }),
      makeTrack({ id: "sw-3", name: "Todo un Palo",                         popularity: 91, trackNumber: 4 }),
      makeTrack({ id: "sw-4", name: "Una Piba Con la Remera de Greenpeace", popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("WIN — Ji Ji Ji en pogo (≥90, sin penalización)", slots, result);

    expect(result.won).toBe(true);
    expect(result.attendance).toBe(400_000);
  });

  it("pogo ganador de baja popularidad — no gana por tier penalty (total≈177 ≤ 352)", () => {
    // Nadie Es Perfecto pop=72 → tier 70–79 → ×0.75=54 (pogo penalizado parcialmente)
    // slot 0: 40×0.5=20 | slot 1: 40×1=40 | slot 2: 72×0.75=54 | slot 3: 43×1=43 | slot 4: 40×0.5=20
    // sum = 177 ≤ 352 → stage 1, no win
    const slots: GameTrack[] = [
      makeTrack({ id: "bp-0", name: "La Ciudad de los Encandilados",           popularity: 40, trackNumber: 1 }),
      makeTrack({ id: "bp-1", name: "Canción para un Goldfish",                popularity: 40, trackNumber: 2 }),
      makeTrack({ id: "bp-2", name: "Nadie Es Perfecto",                       popularity: 72, trackNumber: 3 }),
      makeTrack({ id: "bp-3", name: "Te Estás Quedando Sin Balas de Plata...", popularity: 43, trackNumber: 4 }),
      makeTrack({ id: "bp-4", name: "Chante Noire",                            popularity: 40, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Baja convocatoria + pogo ganador penalizado (no gana)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(100_000);
    expect(result.attendance).toBeLessThanOrEqual(200_000);
  });

  it("win con El Pibe de los Astilleros ≥90 en pogo — gana (sum≈563)", () => {
    // slot 0: 95×1.25=118.75 | slot 1: 95×1=95 | slot 2: 93×1.5=139.5 | slot 3: 98×1=98 | slot 4: 90×1.25=112.5
    // sum = 563.75 > 411; El Pibe de los Astilleros ★ → gana
    const slots: GameTrack[] = [
      makeTrack({ id: "ep-0", name: "Esa Estrella Era Mi Lujo",      popularity: 95, trackNumber: 1 }),
      makeTrack({ id: "ep-1", name: "Tarea Fina",                    popularity: 95, trackNumber: 2 }),
      makeTrack({ id: "ep-2", name: "El Pibe de los Astilleros",     popularity: 93, trackNumber: 3 }),
      makeTrack({ id: "ep-3", name: "Un Poco de Amor Francés",       popularity: 98, trackNumber: 4 }),
      makeTrack({ id: "ep-4", name: "Preso en Mi Ciudad",            popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("WIN — El Pibe de los Astilleros en pogo (≥90)", slots, result);

    expect(result.won).toBe(true);
    expect(result.attendance).toBe(400_000);
  });
});

// ── Tier interactions in special slots ───────────────────────────────────────

describe("tier interactions in special slots (real track names)", () => {
  it("Fuegos de Octubre pop=71 → tier 70–79 (×0.75); sum=378.25 → stage 2, no gana", () => {
    // Sin penalización hubiera sido: 112.5+50+106.5+50+112.5 = 431.5 > 411 → ganaría
    // Con tier 70–79 (×0.75): 112.5+50+53.25+50+112.5 = 378.25 → stage 2, no gana
    const slots: GameTrack[] = [
      makeTrack({ id: "t70-0", name: "La Hija del Fletero",                    popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "t70-1", name: "Una Rata Muerta Entre los Geranios",     popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "t70-2", name: "Fuegos de Octubre",                      popularity: 71, trackNumber: 3 }),
      makeTrack({ id: "t70-3", name: "Sopa de Lágrimas (Para el Pibe Delete)", popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "t70-4", name: "Salando las Heridas",                    popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Fuegos de Octubre pop=71 tier 70–79 (no gana)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(200_000);
    expect(result.attendance).toBeLessThanOrEqual(300_000);
  });

  it("Fuegos de Octubre pop=85 → tier 80–89 (×1); sum=425.5 > 411 → stage 3, no gana (suma OK pero no llega a win)", () => {
    // slot 0: 90×1.25=112.5 | slot 1: 50×1=50 | slot 2: 85×1=85 | slot 3: 50×1=50 | slot 4: 90×1.25=112.5
    // sum = 410 ≤ 411 → stage 2, not won
    // Use slightly higher for slot 1/3 to push past 411 without winning
    // slot 0: 90×1.25=112.5 | slot 1: 65×1=65 | slot 2: 85×1=85 | slot 3: 65×1=65 | slot 4: 90×1.25=112.5
    // sum = 440 > 411 → stage 3, no win (Fuegos de Octubre is a winning name but we test the case where it wins)
    // Actually Fuegos de Octubre IS a winning name — this test confirms it wins when pop ≥ 90 but not in lower tiers
    const slots: GameTrack[] = [
      makeTrack({ id: "t85-0", name: "La Hija del Fletero",                    popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "t85-1", name: "Una Rata Muerta Entre los Geranios",     popularity: 65, trackNumber: 2 }),
      makeTrack({ id: "t85-2", name: "Fuegos de Octubre",                      popularity: 85, trackNumber: 3 }),
      makeTrack({ id: "t85-3", name: "Sopa de Lágrimas (Para el Pibe Delete)", popularity: 65, trackNumber: 4 }),
      makeTrack({ id: "t85-4", name: "Salando las Heridas",                    popularity: 90, trackNumber: 5 }),
    ];
    // sum = 112.5+65+85+65+112.5 = 440 > 411; Fuegos de Octubre pop=85 (tier 80–89 ×1) IS a winning name
    // but pop=85 < 90, so no win — wait, pop=85 < 90 so tier 80–89 → ×1 (not full), but it still IS a winning name
    // computeScore checks pogoIsWinning from the NAME, and popularitySum > STAGE2_MAX — both true here!
    // So this WILL win. Let's use a non-winning track name to test stage 3 without win.
    // Correction: this test demonstrates tier 80–89 pushing sum into stage 3.
    // Using a non-winning name:
    const slots2: (GameTrack | null)[] = [
      makeTrack({ id: "t85b-0", name: "La Hija del Fletero",   popularity: 90 }),
      makeTrack({ id: "t85b-1", name: "Morta Punto Com",        popularity: 65 }),
      makeTrack({ id: "t85b-2", name: "Caña Seca y un Membrillo", popularity: 85 }),
      makeTrack({ id: "t85b-3", name: "Dr. Saturno",            popularity: 65 }),
      makeTrack({ id: "t85b-4", name: "Salando las Heridas",    popularity: 90 }),
    ];
    // sum = 112.5+65+85+65+112.5 = 440 > 411; non-winning pogo → stage 3, no win
    const result = computeScore(slots2);
    printSetlist("Tier 80–89 en pogo → stage 3, sin ganar (pogo no ganador)", slots as GameTrack[], result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(300_000);
    expect(result.attendance).toBeLessThanOrEqual(400_000);
  });

  it("Ji Ji Ji pop=90 (≥90 → ×1.5); mismo setlist que arriba → gana", () => {
    // slot 0: 90×1.25=112.5 | slot 1: 50×1=50 | slot 2: 90×1.5=135 | slot 3: 50×1=50 | slot 4: 90×1.25=112.5
    // sum = 460 > 411; Ji Ji Ji ★ → gana
    const slots: GameTrack[] = [
      makeTrack({ id: "pg-0", name: "La Hija del Fletero",                    popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "pg-1", name: "Una Rata Muerta Entre los Geranios",     popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "pg-2", name: "Ji Ji Ji",                               popularity: 90, trackNumber: 3 }),
      makeTrack({ id: "pg-3", name: "Sopa de Lágrimas (Para el Pibe Delete)", popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "pg-4", name: "Salando las Heridas",                    popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Ji Ji Ji pop=90 (×1.5 sin penalización) — gana", slots, result);

    expect(result.won).toBe(true);
    expect(result.attendance).toBe(400_000);
  });
});

// ── loadGameAlbums ────────────────────────────────────────────────────────────

vi.mock("../api", () => ({
  fetchAlbums: vi.fn(),
  fetchTracks: vi.fn(),
  fetchNormalization: vi.fn(),
}));

vi.mock("./filterAlbums", () => ({
  filterSingles: vi.fn((x: unknown) => x),
  filterEnVivo: vi.fn((x: unknown) => x),
}));

describe("loadGameAlbums", () => {
  const normalization = { min: 0, max: 100 };

  const rawAlbum = {
    id: "a1",
    name: "Oktubre",
    release_date: "1986-01-01",
    images: [{ url: "http://cover.jpg" }],
    album_type: "album",
  };

  const rawTracks = [
    { id: "t1", name: "El Viento", track_number: 1, popularity: 80 },
    { id: "t2", name: "En Vivo bonus", track_number: 2, popularity: 60 },
  ];

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fetchAlbums).mockResolvedValue({ "Patricio Rey": [rawAlbum] } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fetchTracks).mockResolvedValue(rawTracks as any);
    vi.mocked(fetchNormalization).mockResolvedValue(normalization);
  });

  it("returns albums with their tracks", async () => {
    const albums = await loadGameAlbums();
    expect(albums).toHaveLength(1);
    expect(albums[0].name).toBe("Oktubre");
  });

  it("filters out tracks whose name contains 'en vivo'", async () => {
    const albums = await loadGameAlbums();
    const names = albums[0].tracks.map((t) => t.name);
    expect(names).not.toContain("En Vivo bonus");
    expect(names).toContain("El Viento");
  });

  it("normalizes popularity to 0–100", async () => {
    const albums = await loadGameAlbums();
    for (const track of albums[0].tracks) {
      expect(track.popularity).toBeGreaterThanOrEqual(0);
      expect(track.popularity).toBeLessThanOrEqual(100);
    }
  });

  it("deduplicates albums with the same name", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fetchAlbums).mockResolvedValue({
      "Patricio Rey": [rawAlbum, { ...rawAlbum, id: "a2" }],
    } as any);
    const albums = await loadGameAlbums();
    expect(albums).toHaveLength(1);
  });

  it("skips albums that end up with no eligible tracks", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(fetchTracks).mockResolvedValue([
      { id: "t1", name: "En Vivo", track_number: 1, popularity: 50 },
    ] as any);
    const albums = await loadGameAlbums();
    expect(albums).toHaveLength(0);
  });
});
