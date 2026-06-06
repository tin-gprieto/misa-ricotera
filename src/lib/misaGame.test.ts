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
 * Effective sum depends on penalty rule:
 *   pop < 90 (all special slots penalised): pop × (0.5+1+0.5+1+0.5) = pop × 3.5
 *   pop ≥ 90 (no penalty): pop × (1.25+1+1.5+1+1.25) = pop × 6
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

describe("effectiveMultiplier", () => {
  // Special slots (0=Apertura, 2=Pogo, 4=Cierre) with pop < SPECIAL_SLOT_THRESHOLD
  // use ×0.5 instead of their normal multiplier (penalty for weak key tracks).

  it("returns 0.5 for Apertura (slot 0) when pop < threshold", () => {
    expect(effectiveMultiplier(0, 0)).toBe(0.5);
    expect(effectiveMultiplier(0, 89)).toBe(0.5);
  });

  it("returns 0.5 for Pogo (slot 2) when pop < threshold", () => {
    expect(effectiveMultiplier(2, 0)).toBe(0.5);
    expect(effectiveMultiplier(2, 89)).toBe(0.5);
  });

  it("returns 0.5 for Cierre (slot 4) when pop < threshold", () => {
    expect(effectiveMultiplier(4, 0)).toBe(0.5);
    expect(effectiveMultiplier(4, 89)).toBe(0.5);
  });

  it("returns normal multiplier 1.25 for Apertura when pop >= threshold", () => {
    expect(effectiveMultiplier(0, 90)).toBe(1.25);
    expect(effectiveMultiplier(0, 100)).toBe(1.25);
  });

  it("returns normal multiplier 1.5 for Pogo when pop >= threshold", () => {
    expect(effectiveMultiplier(2, 90)).toBe(1.5);
    expect(effectiveMultiplier(2, 100)).toBe(1.5);
  });

  it("returns normal multiplier 1.25 for Cierre when pop >= threshold", () => {
    expect(effectiveMultiplier(4, 90)).toBe(1.25);
    expect(effectiveMultiplier(4, 100)).toBe(1.25);
  });

  it("never penalises non-special slots regardless of pop", () => {
    expect(effectiveMultiplier(1, 0)).toBe(1);
    expect(effectiveMultiplier(1, 89)).toBe(1);
    expect(effectiveMultiplier(1, 90)).toBe(1);
    expect(effectiveMultiplier(3, 0)).toBe(1);
    expect(effectiveMultiplier(3, 89)).toBe(1);
    expect(effectiveMultiplier(3, 90)).toBe(1);
  });

  it("threshold boundary: pop=89 is penalised, pop=90 is not", () => {
    expect(effectiveMultiplier(0, 89)).toBe(0.5);
    expect(effectiveMultiplier(0, 90)).toBe(1.25);
    expect(effectiveMultiplier(2, 89)).toBe(0.5);
    expect(effectiveMultiplier(2, 90)).toBe(1.5);
    expect(effectiveMultiplier(4, 89)).toBe(0.5);
    expect(effectiveMultiplier(4, 90)).toBe(1.25);
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

describe("computeScore", () => {
  // MULTIPLIERS = [1.25, 1, 1.5, 1.25, 1]
  // Penalty: slots 0, 2, 4 with pop < 90 → ×0.5 instead of normal mult
  // STAGE1_MAX = 352  → base 100_000
  // STAGE2_MAX = 411  → base 200_000; above → base 300_000
  // Won: sum > 411 AND pogo slot starts with a winning track name

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
    it("lands in 100k–200k range for low popularity (pop=50, sum≈187.5 with penalty)", () => {
      // pop=50 < 90 → all special slots penalised: 50×(0.5+1+0.5+1.25+0.5) = 187.5 ≤ 352
      const { attendance, won } = computeScore(uniformSlots(50));
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(100_000);
      expect(attendance).toBeLessThanOrEqual(200_000);
    });
  });

  describe("stage 2 (353 ≤ sum ≤ 411)", () => {
    it("lands in 200k–300k range when apertura/cierre are ≥90 but pogo is penalised", () => {
      // Slot 0 pop=90 ≥ 90 → ×1.25=112.5 (no penalty)
      // Slot 1 pop=50 → ×1=50
      // Slot 2 pop=88 < 90 → ×0.5=44 (penalty; non-winning track)
      // Slot 3 pop=50 → ×1=50
      // Slot 4 pop=90 ≥ 90 → ×1.25=112.5 (no penalty)
      // sum = 369 → stage 2
      const slots: (GameTrack | null)[] = [
        makeTrack({ id: "s2-0", popularity: 90 }),
        makeTrack({ id: "s2-1", popularity: 50 }),
        makeTrack({ id: "s2-2", popularity: 88, name: "Not a Winner" }),
        makeTrack({ id: "s2-3", popularity: 50 }),
        makeTrack({ id: "s2-4", popularity: 90 }),
      ];
      const { attendance, won } = computeScore(slots);
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(200_000);
      expect(attendance).toBeLessThanOrEqual(300_000);
    });
  });

  describe("stage 3 (sum > 411, no win condition)", () => {
    it("lands in 300k–400k range for all-high popularity (pop=90, sum=540)", () => {
      // pop=90 ≥ 90 → no penalty: 90×(1.25+1+1.5+1.25+1) = 90×6 = 540 > 411
      const { attendance, won } = computeScore(uniformSlots(90));
      expect(won).toBe(false);
      expect(attendance).toBeGreaterThanOrEqual(300_000);
      expect(attendance).toBeLessThanOrEqual(400_000);
    });
  });

  describe("win condition", () => {
    it("returns 400k and won=true when sum > 411 and pogo is a winning track", () => {
      // pop=90 → sum=540 > 411; pogo slot (index 2) has "Ji Ji Ji" (90 ≥ 90, no penalty)
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
      // pop=50 < 90 → all special slots penalised: sum = 187.5 ≤ 411
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
      score: (track.popularity * mult).toFixed(1),
    };
  });

  const total = rows.reduce((sum, r) => sum + parseFloat(r.score), 0);
  const verdict = result.won
    ? "¡GANASTE! — 400.000 personas, estadio lleno"
    : `${result.attendance.toLocaleString("es-AR")} personas (${
        result.attendance < 200_000 ? "~100k–200k" :
        result.attendance < 300_000 ? "~200k–300k" : "~300k–400k"
      })`;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
  console.table(rows);
  console.log(`  Total ponderado : ${total.toFixed(1)}`);
  console.log(`  Resultado       : ${verdict}`);
  console.log("─".repeat(60));
}

// Real normalized popularities (norm = round((raw - 12) / 58 * 100)):
//   raw=35 → norm=40 | raw=37 → norm=43 | raw=41 → norm=50 | raw=53 → norm=71
//   raw=54 → norm=72 | raw=63 → norm=88 | raw=64 → norm=90 | raw=65 → norm=91
//   raw=66 → norm=93 | raw=67 → norm=95 | raw=69 → norm=98 | raw=70 → norm=100
//
// Effective multipliers with penalty rule (pop < 90 in slots 0, 2, 4 → ×0.5):
//   slot 0: pop ≥ 90 → ×1.25;  pop < 90 → ×0.5
//   slot 1: always ×1
//   slot 2: pop ≥ 90 → ×1.5;   pop < 90 → ×0.5
//   slot 3: always ×1
//   slot 4: pop ≥ 90 → ×1.25;  pop < 90 → ×0.5

describe("stage scenarios (real track names)", () => {
  it("stage 1 — convocatoria baja, todos penalizados (~100k–200k, total≈175)", () => {
    // all pop=50 < 90 → special slots penalised: 50×(0.5+1+0.5+1+0.5) = 175 ≤ 352
    const slots: GameTrack[] = [
      makeTrack({ id: "s1-0", name: "Una Rata Muerta Entre los Geranios",     popularity: 50, trackNumber: 1 }),
      makeTrack({ id: "s1-1", name: "Sopa de Lágrimas (Para el Pibe Delete)", popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "s1-2", name: "Nike Es la Cultura",                     popularity: 50, trackNumber: 3 }),
      makeTrack({ id: "s1-3", name: "Morta Punto Com",                        popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "s1-4", name: "Dr. Saturno",                            popularity: 50, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 1 — Convocatoria baja (todos penalizados)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(100_000);
    expect(result.attendance).toBeLessThanOrEqual(200_000);
  });

  it("stage 2 — apertura/cierre top (≥90), pogo mediocre penalizado (~200k–300k, total=369)", () => {
    // Apertura pop=90 → ×1.25=112.5 (no penalty)
    // Pogo pop=88 < 90 → ×0.5=44 (PENALTY; Caña Seca y un Membrillo, raw=63)
    // Cierre pop=90 → ×1.25=112.5 (no penalty)
    // sum = 112.5 + 50 + 44 + 50 + 112.5 = 369 → stage 2
    const slots: GameTrack[] = [
      makeTrack({ id: "s2-0", name: "La Hija del Fletero",          popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "s2-1", name: "Morta Punto Com",              popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "s2-2", name: "Caña Seca y un Membrillo",     popularity: 88, trackNumber: 3 }),
      makeTrack({ id: "s2-3", name: "Dr. Saturno",                  popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "s2-4", name: "Salando las Heridas",          popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 2 — Apertura/Cierre top, pogo penalizado", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(200_000);
    expect(result.attendance).toBeLessThanOrEqual(300_000);
  });

  it("stage 3 — gran convocatoria sin ganar, todo ≥90 (~300k–400k, total≈551)", () => {
    // All special slots ≥90 → no penalty
    // 95×1.25 + 93×1 + 91×1.5 + 90×1 + 90×1.25 = 118.75+93+136.5+90+112.5 = 550.75 > 411
    // pogo: "Todo un Palo" — no es track ganador
    const slots: GameTrack[] = [
      makeTrack({ id: "s3-0", name: "La Bestia Pop",                          popularity: 95, trackNumber: 1 }),
      makeTrack({ id: "s3-1", name: "Vencedores Vencidos",                    popularity: 93, trackNumber: 2 }),
      makeTrack({ id: "s3-2", name: "Todo un Palo",                           popularity: 91, trackNumber: 3 }),
      makeTrack({ id: "s3-3", name: "Una Piba Con la Remera de Greenpeace",   popularity: 90, trackNumber: 4 }),
      makeTrack({ id: "s3-4", name: "Yo Caníbal",                             popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Stage 3 — Gran convocatoria (sin ganar)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(300_000);
    expect(result.attendance).toBeLessThanOrEqual(400_000);
  });

  it("win — estadio lleno con Ji Ji Ji en el pogo, todo ≥90 (total≈555)", () => {
    // All ≥90 → no penalty. 95×1.25 + 93×1 + 93×1.5 + 91×1 + 90×1.25
    //   = 118.75+93+139.5+91+112.5 = 554.75 > 411; Ji Ji Ji ★ → gana
    const slots: GameTrack[] = [
      makeTrack({ id: "sw-0", name: "La Bestia Pop",                        popularity: 95, trackNumber: 1 }),
      makeTrack({ id: "sw-1", name: "Vencedores Vencidos",                  popularity: 93, trackNumber: 2 }),
      makeTrack({ id: "sw-2", name: "Ji Ji Ji",                             popularity: 93, trackNumber: 3 }),
      makeTrack({ id: "sw-3", name: "Todo un Palo",                         popularity: 91, trackNumber: 4 }),
      makeTrack({ id: "sw-4", name: "Una Piba Con la Remera de Greenpeace", popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("WIN — Ji Ji Ji en el pogo (todo ≥90)", slots, result);

    expect(result.won).toBe(true);
    expect(result.attendance).toBe(400_000);
  });

  it("baja convocatoria con pogo ganador — no gana por penalización (total≈159)", () => {
    // Nadie Es Perfecto pop=72 < 90 → pogo penalizado (×0.5=36)
    // 40×0.5 + 40×1 + 72×0.5 + 43×1 + 40×0.5 = 20+40+36+43+20 = 159 ≤ 352
    // track ganador en pogo pero penalizado → not won
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

  it("buena convocatoria con pogo ganador distinto a Ji Ji Ji — gana (total≈564)", () => {
    // El Pibe de los Astilleros pop=93 ≥ 90 → ×1.5=139.5 (no penalty)
    // 95×1.25 + 95×1 + 93×1.5 + 98×1 + 90×1.25 = 118.75+95+139.5+98+112.5 = 563.75 > 411 → gana
    const slots: GameTrack[] = [
      makeTrack({ id: "ep-0", name: "Esa Estrella Era Mi Lujo",        popularity: 95, trackNumber: 1 }),
      makeTrack({ id: "ep-1", name: "Tarea Fina",                      popularity: 95, trackNumber: 2 }),
      makeTrack({ id: "ep-2", name: "El Pibe de los Astilleros",       popularity: 93, trackNumber: 3 }),
      makeTrack({ id: "ep-3", name: "Un Poco de Amor Francés",         popularity: 98, trackNumber: 4 }),
      makeTrack({ id: "ep-4", name: "Preso en Mi Ciudad",              popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Buena convocatoria + El Pibe de los Astilleros en pogo (gana)", slots, result);

    expect(result.won).toBe(true);
    expect(result.attendance).toBe(400_000);
  });
});

// ── Penalización en slots especiales ─────────────────────────────────────────

describe("penalización en slots especiales (real track names)", () => {
  it("pogo ganador penalizado (pop=71 < 90) — no gana aunque el nombre es ganador (total≈360.5)", () => {
    // Fuegos de Octubre pop=71 < 90 → pogo PENALIZADO: ×0.5=35.5 en vez de ×1.5=106.5
    // Sin penalización: 112.5+50+106.5+50+112.5 = 431.5 > 411 → ganaría
    // Con penalización: 112.5+50+35.5+50+112.5 = 360.5 → stage 2, no gana
    const slots: GameTrack[] = [
      makeTrack({ id: "pe-0", name: "La Hija del Fletero",                   popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "pe-1", name: "Una Rata Muerta Entre los Geranios",    popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "pe-2", name: "Fuegos de Octubre",                     popularity: 71, trackNumber: 3 }),
      makeTrack({ id: "pe-3", name: "Sopa de Lágrimas (Para el Pibe Delete)",popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "pe-4", name: "Salando las Heridas",                   popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Fuegos de Octubre en pogo — penalizado (no gana)", slots, result);

    expect(result.won).toBe(false);
    expect(result.attendance).toBeGreaterThanOrEqual(200_000);
    expect(result.attendance).toBeLessThanOrEqual(300_000);
  });

  it("mismo setlist con Ji Ji Ji (pop=93 ≥ 90) en pogo — no penalizado, gana (total≈464.5)", () => {
    // Ji Ji Ji pop=93 ≥ 90 → pogo SIN penalización: ×1.5=139.5
    // 112.5+50+139.5+50+112.5 = 464.5 > 411 → gana
    const slots: GameTrack[] = [
      makeTrack({ id: "pg-0", name: "La Hija del Fletero",                   popularity: 90, trackNumber: 1 }),
      makeTrack({ id: "pg-1", name: "Una Rata Muerta Entre los Geranios",    popularity: 50, trackNumber: 2 }),
      makeTrack({ id: "pg-2", name: "Ji Ji Ji",                              popularity: 93, trackNumber: 3 }),
      makeTrack({ id: "pg-3", name: "Sopa de Lágrimas (Para el Pibe Delete)",popularity: 50, trackNumber: 4 }),
      makeTrack({ id: "pg-4", name: "Salando las Heridas",                   popularity: 90, trackNumber: 5 }),
    ];

    const result = computeScore(slots);
    printSetlist("Ji Ji Ji en pogo — sin penalización (gana)", slots, result);

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
