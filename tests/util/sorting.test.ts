import { describe, it, expect, afterEach } from "vitest";
import {
  sortLocationsDeterministic,
  sortItinerariesDeterministic,
  sortDeparturesDeterministic,
  ResolvedLocation,
  Itinerary,
  Departure,
} from "../../src/util/sorting";
import { lookupAddressOrStop } from "../../src/services/lookupService";
import { makeNameTieSet, featureWithGeometry, makeHttpResponse } from "../fixtures/geocodingResponses";
import { setupHttpGetMock, restoreHttpGetMock } from "../utils/httpMock";

describe("sorting: candidates tie-breaks", () => {
  afterEach(() => {
    // ensure http mock cleanup if any test used it
    try {
      restoreHttpGetMock();
    } catch {}
  });

  it("sorting: candidates tie - confidence equal different names -> lexical ASC ordering", () => {
    const a: ResolvedLocation = {
      confidenceScore: 0.9,
      primaryLanguage: "en",
      coordinate: { lat: 60.0, lon: 24.0 },
      name: "Banana",
    };
    const b: ResolvedLocation = {
      confidenceScore: 0.9,
      primaryLanguage: "en",
      coordinate: { lat: 60.0, lon: 24.0 },
      name: "Apple",
    };
    const arr = [a, b];
    arr.sort(sortLocationsDeterministic);
    expect(arr.map((x) => x.name)).toEqual(["Apple", "Banana"]);
  });

  it("sorting: candidates tie - confidence equal, names equal differing only by case -> localeCompare ordering (documented expectation)", () => {
    // Documented: comparator uses localeCompare (case-sensitive in practice),
    // so "Apple" sorts before "apple" in typical JS localeCompare behavior.
    const lower: ResolvedLocation = { confidenceScore: 0.8, primaryLanguage: "en", name: "apple" };
    const upper: ResolvedLocation = { confidenceScore: 0.8, primaryLanguage: "en", name: "Apple" };
    const arr = [lower, upper];
    arr.sort(sortLocationsDeterministic);
    expect(arr.map((x) => x.name)).toEqual(["apple", "Apple"]);
  });

  it("sorting: candidates tie - confidence equal, names equal, coordinates different -> lat then lon ordering", () => {
    const a: ResolvedLocation = {
      confidenceScore: 0.7,
      primaryLanguage: "en",
      name: "SameName",
      coordinate: { lat: 60.01, lon: 24.10 },
    };
    const b: ResolvedLocation = {
      confidenceScore: 0.7,
      primaryLanguage: "en",
      name: "SameName",
      coordinate: { lat: 60.02, lon: 24.00 },
    };
    // Provide unsorted input to ensure comparator reorders
    const arr = [b, a];
    arr.sort(sortLocationsDeterministic);
    expect(arr.map((x) => x.coordinate!.lat)).toEqual([60.01, 60.02]);
  });

  it("sorting: candidates tie - confidence equal, names different, one missing coordinate -> no crash and lexical name order", () => {
    const withCoord: ResolvedLocation = {
      confidenceScore: 0.5,
      primaryLanguage: "en",
      name: "Zoo",
      coordinate: { lat: 60.0, lon: 24.0 },
    };
    const noCoord: ResolvedLocation = {
      confidenceScore: 0.5,
      primaryLanguage: "en",
      name: "Alpha",
      // coordinate omitted intentionally
    };
    const arr = [withCoord, noCoord];
    arr.sort(sortLocationsDeterministic);
    // Since coordinates are not both present, comparator falls back to name ordering
    expect(arr.map((x) => x.name)).toEqual(["Alpha", "Zoo"]);
  });

  it("sorting: invocation via lookupService uses comparator (name tie -> lexical order)", async () => {
    // Use fixture helper to produce features with identical confidence and identical coords
    const names = ["Zeta", "Alpha", "Gamma"];
    const features = makeNameTieSet(names, 0.88, 24.94, 60.17);
    setupHttpGetMock([makeHttpResponse({ status: 200, features })]);
    try {
      const res = await lookupAddressOrStop({ text: "test" });
      // Expect sorted by name ascending (Alpha, Gamma, Zeta)
      expect(res.candidates.map((c) => c.name)).toEqual(["Alpha", "Gamma", "Zeta"]);
    } finally {
      restoreHttpGetMock();
    }
  });
});

describe("sorting: itineraries deterministic", () => {
  it("itineraries: different duration -> shorter duration first (primary key)", () => {
    const a: Itinerary = { durationMinutes: 30, numberOfTransfers: 1, startTime: "2025-01-01T10:00:00Z", id: "itA" };
    const b: Itinerary = { durationMinutes: 20, numberOfTransfers: 2, startTime: "2025-01-01T09:00:00Z", id: "itB" };
    const c: Itinerary = { durationMinutes: 40, numberOfTransfers: 0, startTime: "2025-01-01T08:00:00Z", id: "itC" };
    const arr = [a, b, c];
    arr.sort(sortItinerariesDeterministic);
    expect(arr.map((i) => i.id)).toEqual(["itB", "itA", "itC"]);
  });

  it("itineraries: same duration different transfers -> fewer transfers first (secondary key)", () => {
    const a: Itinerary = { durationMinutes: 30, numberOfTransfers: 2, startTime: "2025-01-01T10:00:00Z", id: "itA" };
    const b: Itinerary = { durationMinutes: 30, numberOfTransfers: 1, startTime: "2025-01-01T11:00:00Z", id: "itB" };
    const arr = [a, b];
    arr.sort(sortItinerariesDeterministic);
    expect(arr.map((i) => i.id)).toEqual(["itB", "itA"]);
  });

  it("itineraries: same duration & transfers different startTime -> earlier startTime first (tertiary key)", () => {
    const a: Itinerary = { durationMinutes: 25, numberOfTransfers: 1, startTime: "2025-01-01T11:00:00Z", id: "itA" };
    const b: Itinerary = { durationMinutes: 25, numberOfTransfers: 1, startTime: "2025-01-01T10:30:00Z", id: "itB" };
    const arr = [a, b];
    arr.sort(sortItinerariesDeterministic);
    expect(arr.map((i) => i.id)).toEqual(["itB", "itA"]);
  });

  it("itineraries: full tie (duration, transfers, startTime) -> lexical id fallback (deterministic)", () => {
    const a: Itinerary = { durationMinutes: 20, numberOfTransfers: 0, startTime: "2025-01-01T09:00:00Z", id: "itB" };
    const b: Itinerary = { durationMinutes: 20, numberOfTransfers: 0, startTime: "2025-01-01T09:00:00Z", id: "itA" };
    const arr = [a, b];
    arr.sort(sortItinerariesDeterministic);
    expect(arr.map((i) => i.id)).toEqual(["itA", "itB"]);
  });
});

describe("sorting: departures deterministic", () => {
  it("departures: same scheduledTime different routeShortName -> routeShortName tiebreak applied", () => {
    const a: Departure = { scheduledTime: "2025-01-01T09:00:00Z", routeShortName: "2" };
    const b: Departure = { scheduledTime: "2025-01-01T09:00:00Z", routeShortName: "10" };
    const arr = [a, b];
    arr.sort(sortDeparturesDeterministic);
    // "10" sorts before "2" lexically (as strings)
    expect(arr.map((d) => d.routeShortName)).toEqual(["10", "2"]);
  });

  it("departures: different scheduledTime chronological ordering unaffected by route name", () => {
    const a: Departure = { scheduledTime: "2025-01-01T10:00:00Z", routeShortName: "A" };
    const b: Departure = { scheduledTime: "2025-01-01T09:00:00Z", routeShortName: "Z" };
    const arr = [a, b];
    arr.sort(sortDeparturesDeterministic);
    expect(arr.map((d) => d.scheduledTime)).toEqual(["2025-01-01T09:00:00Z", "2025-01-01T10:00:00Z"]);
  });

  it("departures: identical times ordering stable across runs (deterministic)", () => {
    const base: Departure[] = [
      { scheduledTime: "2025-01-01T09:00:00Z", routeShortName: "X" },
      { scheduledTime: "2025-01-01T09:00:00Z", routeShortName: "A" },
      { scheduledTime: "2025-01-01T09:00:00Z", routeShortName: "M" },
    ];
    // Shuffle and sort multiple times and assert same final order
    function shuffle<T>(arr: T[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    const orderings: string[][] = [];
    for (let r = 0; r < 3; r++) {
      const clone = base.slice();
      shuffle(clone);
      clone.sort(sortDeparturesDeterministic);
      orderings.push(clone.map((d) => d.routeShortName || ""));
    }
    expect(orderings[0]).toEqual(orderings[1]);
    expect(orderings[1]).toEqual(orderings[2]);
  });
});

describe("sorting: determinism stress test for candidates", () => {
  it("determinism: shuffled inputs yield identical sorted order across multiple shuffles", () => {
    const N = 50;
    const names = ["A", "B", "C", "D", "E"];
    const items: ResolvedLocation[] = [];
    for (let i = 0; i < N; i++) {
      items.push({
        confidenceScore: 0.8 + ((i % 3) * 0.01),
        primaryLanguage: "en",
        name: names[i % names.length] + (i % 7),
        coordinate: { lat: 60 + ((i % 11) * 0.001), lon: 24 + ((i % 13) * 0.001) },
      });
    }

    function shuffle<T>(a: T[]) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
    }

    const fingerprint = (arr: ResolvedLocation[]) =>
      arr.map((x) => `${x.name}|${x.confidenceScore}|${x.coordinate!.lat.toFixed(6)}|${x.coordinate!.lon.toFixed(6)}`);

    let last: string[] | null = null;
    for (let r = 0; r < 5; r++) {
      const clone = items.map((it) => JSON.parse(JSON.stringify(it)) as ResolvedLocation);
      shuffle(clone);
      clone.sort(sortLocationsDeterministic);
      const fp = fingerprint(clone);
      if (last) {
        expect(fp).toEqual(last);
      }
      last = fp;
    }
  });
});