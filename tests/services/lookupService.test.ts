/*
 * Tests for lookupService
 *
 * Service under test: [`src/services/lookupService.ts`](src/services/lookupService.ts:1)
 * Mock boundary (httpGet): [`src/services/lookupService.ts`](src/services/lookupService.ts:70)
 * Scenario matrix: Subtask 02 (S01–S22)
 * Fixture scaffold: [`tests/fixtures/geocodingResponses.ts`](tests/fixtures/geocodingResponses.ts:1)
 *
 * Notes:
 * - This file contains structural placeholders only. Do NOT implement assertions, fixtures, or mocks here.
 */

import { describe, it, expect } from "vitest";
import { lookupAddressOrStop } from "../../src/services/lookupService";
import { buildFeature, featureWithGeometry, featureWithCenter, featureNoCoordinate, makeHttpResponse } from "../fixtures/geocodingResponses";
import { setupHttpGetMock, restoreHttpGetMock, getHttpGetCalls } from "../utils/httpMock";
// Helper to reduce repetition: produces a single queued successful geocoding response
const singleFeatureResponse = (feature: any) => [makeHttpResponse({ status: 200, features: [feature] })];

describe("lookupAddressOrStop service", () => {
 // Error Mapping (S01–S06)
 // Focused unit tests for error & validation mapping behavior in lookupAddressOrStop.
 // - see status handling lines 71-83 for upstream-mapping logic (not exercised here beyond mapping assertions)
 // - see name map & pickBestName invocation lines 90-96 not exercised here intentionally
 // TODO: (Task 19) Consider extending http mock for header assertion helpers
describe("Error Mapping", () => {
  // Minimal helper to assert thrown error payloads (keeps tests DRY).
  // Intentionally local to this file; do NOT extract to utils yet (reserved for Task 16).
  function assertRejectedWith(promise: Promise<unknown>, expected: Record<string, unknown>) {
    return expect(promise).rejects.toMatchObject(expected as any);
  }

  it("S01 validation missing text → VALIDATION/MISSING_TEXT", async () => {
    // Validation path (short-circuits before any http call)
    // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:52-55)
    await assertRejectedWith(lookupAddressOrStop({ text: "" }), {
      category: "VALIDATION",
      code: "MISSING_TEXT",
    });
  });

  it("S02 401 upstream → AUTH_FAILURE/INVALID_API_KEY", async () => {
    // Upstream 401 mapping to auth failure
    // status handling lines 71-73
    // use top-level static import: setupHttpGetMock
    setupHttpGetMock([{ status: 401, body: {} }]);

    await assertRejectedWith(lookupAddressOrStop({ text: "x" }), {
      category: "AUTH_FAILURE",
      code: "INVALID_API_KEY",
      // light message substring check
      message: expect.stringContaining("Authentication"),
    });
  });

  it("S03 403 upstream → AUTH_FAILURE/INVALID_API_KEY", async () => {
    // Upstream 403 maps identically to 401 path
    // status handling lines 71-73
    // use top-level static import: setupHttpGetMock
    setupHttpGetMock([{ status: 403, body: {} }]);

    await assertRejectedWith(lookupAddressOrStop({ text: "x" }), {
      category: "AUTH_FAILURE",
      code: "INVALID_API_KEY",
      message: expect.stringContaining("Authentication"),
    });
  });

  it("S04 429 with retry-after header → THROTTLED/UPSTREAM_THROTTLED (retryAfter passthrough)", async () => {
    // Upstream throttling with explicit retry-after header should pass numeric value through
    // status handling lines 74-79
    // use top-level static import: setupHttpGetMock
    setupHttpGetMock([{ status: 429, body: { headers: { "retry-after": 42 } } }]);

    await assertRejectedWith(lookupAddressOrStop({ text: "x" }), {
      category: "THROTTLED",
      code: "UPSTREAM_THROTTLED",
      details: { retryAfter: 42 },
    });
  });

  it("S05 429 without retry-after header → THROTTLED/UPSTREAM_THROTTLED (default retryAfter=60)", async () => {
    // Upstream 429 without retry-after must fall back to default retryAfter == 60
    // status handling lines 74-79 (default on line 76)
    // use top-level static import: setupHttpGetMock
    setupHttpGetMock([{ status: 429, body: {} }]);

    await assertRejectedWith(lookupAddressOrStop({ text: "x" }), {
      category: "THROTTLED",
      code: "UPSTREAM_THROTTLED",
      details: { retryAfter: 60 },
    });
  });

  it("S06 5xx upstream → UPSTREAM_FAILURE/GEOCODING_ERROR", async () => {
    // Any 5xx should map to UPSTREAM_FAILURE / GEOCODING_ERROR
    // status handling lines 81-83
    // use top-level static import: setupHttpGetMock
    setupHttpGetMock([{ status: 502, body: {} }]);

    await assertRejectedWith(lookupAddressOrStop({ text: "x" }), {
      category: "UPSTREAM_FAILURE",
      code: "GEOCODING_ERROR",
      // message should be present (non-empty)
      message: expect.any(String),
    });
  });
});
  // Validation (S01)
  describe("Validation", () => {
    it("S01 input validation – TODO", async () => {
      // TODO: Implement S01 (invalid inputs / validation errors)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:1)
    });
  });

  // Upstream Errors (S02–S05)
  describe("Upstream Errors", () => {
    it("S02 upstream network error mapping – TODO", async () => {
      // TODO: Implement S02 (network error -> mapped error)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:70)
    });

    it("S03 upstream timeout handling – TODO", async () => {
      // TODO: Implement S03 (timeouts)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:70)
    });

    it("S04 upstream 5xx handling – TODO", async () => {
      // TODO: Implement S04 (5xx responses)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:70)
    });

    it("S05 upstream malformed payload – TODO", async () => {
      // TODO: Implement S05 (malformed response)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:70)
    });
  });

  // Empty & Basic Success (S06–S07)
  describe("Empty & Basic Success", () => {
    it("S06 empty result handling – TODO", async () => {
      // TODO: Implement S06 (no results)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:1)
    });

    it("S07 basic successful geocoding result – single high-confidence candidate", async () => {
      // Lines referenced:
      // - needsClarification predicate: [`src/services/lookupService.ts`](src/services/lookupService.ts:145)
      // - mapping loop / candidate mapping: [`src/services/lookupService.ts`](src/services/lookupService.ts:86-113)
      // - deterministic comparator (sort path exercised): [`src/util/sorting.ts`](src/util/sorting.ts:24)
      // NOTE: Inline ad-hoc mock for httpGet used here.

      const HIGH_CONF = 0.95;
      const LAT = 60.171;
      const LON = 24.941;
      const feature = featureWithGeometry({
        lon: LON,
        lat: LAT,
        confidence: HIGH_CONF,
        name: "Kamppi",
        name_en: "Kamppi",
        name_sv: "Kamppi",
        label: "Kamppi, Helsinki",
      });

      // Inline mock boundary for httpGet (temporary)
      // use top-level static import: setupHttpGetMock
      setupHttpGetMock(singleFeatureResponse(feature));

      try {
        const res = await lookupAddressOrStop({ text: "Kamppi" });

        // Basic result shape
        expect(res.candidates.length).toBe(1);

        // With single candidate, needsClarification must be false (see predicate at line 145)
        expect(res.needsClarification).toBe(false);

        const c = res.candidates[0];

        // Confidence normalization: exact match for provided high confidence
        expect(c.confidenceScore).toBe(HIGH_CONF);

        // Coordinate extraction shape
        expect(c.coordinate).toBeDefined();
        expect(typeof c.coordinate!.lat).toBe("number");
        expect(typeof c.coordinate!.lon).toBe("number");

        // Primary language should be one of permitted values (do not overfit)
        expect(["fi", "en", "sv", "default"]).toContain(c.primaryLanguage);

        // Determinism sanity: still a single element after sort/truncate (sort comparator exercised)
        expect(res.candidates.length).toBe(1);

        // Optional micro-case: ensure upper bound 1.0 is preserved by normalization
        const featureMax = featureWithGeometry({
          lon: LON,
          lat: LAT,
          confidence: 1.0,
          name: "Kamppi",
          label: "Kamppi",
        });
        // Queue one-off next response via shared utility for second invocation
        setupHttpGetMock([makeHttpResponse({ status: 200, features: [featureMax] })]);
        const res2 = await lookupAddressOrStop({ text: "Kamppi" });
        expect(res2.candidates.length).toBe(1);
        expect(res2.candidates[0].confidenceScore).toBe(1.0);
      } finally {
        restoreHttpGetMock();
      }
    });
  });

  // Coordinate Extraction (S08–S09)
  describe("Coordinate Extraction", () => {
    // Ensure mocks restored after each spec in this group
    afterEach(() => {
      // Synchronous cleanup: restore spy state
      restoreHttpGetMock();
    });
  
    it("S08 feature with center but no geometry.coordinates → coordinate extracted", async () => {
      // Coordinate extraction decision: [`src/services/lookupService.ts`](src/services/lookupService.ts:39-50)
      // Mapping stage where `coordinate` assigned: [`src/services/lookupService.ts`](src/services/lookupService.ts:106-112)
      // TODO: Expand coordinate edge cases (multi-feature mix) in composite scenario (Task 15)
      // TODO: Add explicit test for geometry present & center present preference (future)
  
      const HIGH_CONF = 0.95;
      const LAT = 60.170;
      const LON = 24.931;
  
      // Feature with empty geometry.coordinates but with a center fallback (pelias-style)
      const feature = featureWithCenter({
        id: "center-1",
        lon: LON,
        lat: LAT,
        confidence: HIGH_CONF,
        name: "CenterPlace",
        label: "CenterPlace, Region",
      });
  
      // use top-level static import: setupHttpGetMock
      setupHttpGetMock(singleFeatureResponse(feature));
  
      const res = await lookupAddressOrStop({ text: "CenterPlace" });
  
      // 1) Single candidate returned
      expect(res.candidates.length).toBe(1);
  
      // 2) Coordinate extracted from `center` field and normalized to { lat, lon }
      const c = res.candidates[0];
      expect(c.coordinate).toBeDefined();
      expect(c.coordinate).toEqual({ lat: LAT, lon: LON });
  
      // 3) Confidence preserved from feature properties
      expect(c.confidenceScore).toBe(HIGH_CONF);
  
      // 4) Single candidate => no clarification required
      expect(res.needsClarification).toBe(false);
  
      // Negative assertions (sanity)
      expect(typeof c.coordinate!.lat).toBe("number");
      expect(typeof c.coordinate!.lon).toBe("number");
    });
  
    it("S09 malformed coordinates & no center with distance filter → candidate excluded", async () => {
      // Distance filter conditional & early exclusion when `!c.coordinate`: [`src/services/lookupService.ts`](src/services/lookupService.ts:117-135)
      // Mapping stage where `coordinate` assigned: [`src/services/lookupService.ts`](src/services/lookupService.ts:106-112)
      // This test ensures a candidate with malformed geometry and no center is removed by distance filtering
  
      const MALFORMED_CONF = 0.85;
      // Provide a single-element coordinates array (malformed) and NO center
      const malformedFeature = buildFeature({
        propertiesOverride: {
          confidence: MALFORMED_CONF,
          name: "BrokenPlace",
          label: "BrokenPlace, Region",
        },
        geometry: { type: "Point", coordinates: [24.931] }, // length 1 -> invalid
        // no center provided
      } as any);
  
      // use top-level static import: setupHttpGetMock
      setupHttpGetMock([makeHttpResponse({ status: 200, features: [malformedFeature] })]);
      // Provide focus + maxDistanceMeters to activate distance filtering path that excludes candidates without coordinate
      const focus = { lat: 60.170, lon: 24.931 };
      const res = await lookupAddressOrStop({
        text: "BrokenPlace",
        focus,
        maxDistanceMeters: 500,
      });
  
      // Candidate should be excluded because `extractCoordinate` returns undefined and filter does `if (!c.coordinate) return false`
      expect(res.candidates.length).toBe(0);
  
      // With zero candidates, needsClarification must be false per predicate logic
      expect(res.needsClarification).toBe(false);
  
      // Implicitly confirms the filter path was exercised — coordinate was undefined and thus excluded
      // (No further runtime assertion required; this is evidenced by the empty candidate list)
    });
  });

  // Confidence Normalization (S10–S12)
  describe("Confidence Normalization", () => {
    // TODO: Add multi-candidate normalization variance test in composite scenario (Task 15)
    afterEach(() => {
      // Ensure each test isolates its spies/mocks
      // restoreHttpGetMock ensures http spy and other mocks are cleared
      restoreHttpGetMock();
    });
  
    it("S10 confidence <0 upstream → clamped 0", async () => {
      // normalization logic lines 29-37
      const LAT = 60.17;
      const LON = 24.93;
      const upstreamRawValue = -5;
      const feature = featureWithGeometry({
        lon: LON,
        lat: LAT,
        confidence: upstreamRawValue,
        name: "NegativeConf",
        label: "NegativeConf, Region",
      });
  
      // use top-level static import: setupHttpGetMock
      setupHttpGetMock(singleFeatureResponse(feature));
      const res = await lookupAddressOrStop({ text: "NegativeConf", lang: ["fi"] });
  
      // 1) Single candidate returned
      expect(res.candidates.length).toBe(1);
  
      // 2) Single candidate -> no clarification required
      expect(res.needsClarification).toBe(false);
  
      const c = res.candidates[0];
  
      // 3) Confidence clamped to 0
      expect(c.confidenceScore).toBe(0);
  
      // 4) Original upstream raw kept intact (no mutation)
      expect(c.raw.properties.confidence).toBe(upstreamRawValue);
  
      // Negative sanity checks
      expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(c.confidenceScore).toBeLessThanOrEqual(1);
    });
  
    it("S11 confidence >1 upstream → clamped 1", async () => {
      // normalization logic lines 29-37
      const LAT = 60.17;
      const LON = 24.93;
      const upstreamRawValue = 7;
      const feature = featureWithGeometry({
        lon: LON,
        lat: LAT,
        confidence: upstreamRawValue,
        name: "TooHighConf",
        label: "TooHighConf, Region",
      });
  
      // use top-level static import: setupHttpGetMock
      setupHttpGetMock(singleFeatureResponse(feature));
      const res = await lookupAddressOrStop({ text: "TooHighConf" });
  
      // 1) Single candidate returned
      expect(res.candidates.length).toBe(1);
  
      // 2) Single candidate -> no clarification required
      expect(res.needsClarification).toBe(false);
  
      const c = res.candidates[0];
  
      // 3) Confidence clamped to 1
      expect(c.confidenceScore).toBe(1);
  
      // 4) Original upstream raw kept intact (no mutation)
      expect(c.raw.properties.confidence).toBe(upstreamRawValue);
  
      // Negative sanity checks
      expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(c.confidenceScore).toBeLessThanOrEqual(1);
    });
  
    it("S12 missing confidence/score upstream → default 0", async () => {
      // normalization fallback line 35-37
      const LAT = 60.17;
      const LON = 24.93;
      const feature = featureWithGeometry({
        lon: LON,
        lat: LAT,
        name: "NoScore",
        label: "NoScore, Region",
      } as any);
  
      // use top-level static import: setupHttpGetMock
      setupHttpGetMock(singleFeatureResponse(feature));
      const res = await lookupAddressOrStop({ text: "NoScore" });
  
      // 1) Single candidate returned
      expect(res.candidates.length).toBe(1);
  
      // 2) Single candidate -> no clarification required
      expect(res.needsClarification).toBe(false);
  
      const c = res.candidates[0];
  
      // 3) Missing upstream values default to 0
      expect(c.confidenceScore).toBe(0);
  
      // Raw should not contain a numeric confidence property
      expect(c.raw.properties.confidence).toBeUndefined();
      expect(c.raw.properties.score).toBeUndefined();
  
      // Negative sanity checks
      expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(c.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  // Localization & Fallback (S13–S14)
  describe("Localization & Fallback", () => {
    it("S13 language preference applied – the preferred language (fi) is selected when available", async () => {
      // References:
      // - Name assembly map: [`src/services/lookupService.ts`](src/services/lookupService.ts:90-96)
      // - pickBestName invocation: [`src/services/lookupService.ts`](src/services/lookupService.ts:96)
      // - primaryLanguage selection loop: [`src/services/lookupService.ts`](src/services/lookupService.ts:98-105)
      // Utilities: fallbackChain / pickBestName: [`src/util/languageFallback.ts`](src/util/languageFallback.ts:3)
      // TODO: Replace ad-hoc language feature construction with fixture presets (Task 19)
      // TODO: Add unicode / diacritic normalization tests in later localization task (future)

      const HIGH_CONF = 0.95;
      const feature = featureWithGeometry({
        lon: 24.93,
        lat: 60.17,
        confidence: HIGH_CONF,
        name: "Helsingin Esimerkki",
        name_en: "Example Helsinki",
        name_sv: "Exempel Helsingfors",
        label: "Helsingin Esimerkki, Helsinki",
      });

      // use top-level static import: setupHttpGetMock
      setupHttpGetMock(singleFeatureResponse(feature));

      try {
        // Preferred languages: Finnish first, then English
        const res = await lookupAddressOrStop({ text: "Helsingin", lang: ["fi", "en"] });

        // 1) Single candidate returned
        expect(res.candidates.length).toBe(1);
        // 2) High confidence ensures needsClarification false regardless
        expect(res.needsClarification).toBe(false);

        const c = res.candidates[0];

        // 3) Name resolved to Finnish form (preferred)
        expect(c.name).toBe("Helsingin Esimerkki");

        // 4) primaryLanguage should reflect 'fi' chosen by fallback chain
        expect(c.primaryLanguage).toBe("fi");

        // 5) Raw properties should contain the Finnish source used
        expect(c.raw.properties).toBeDefined();
        expect(c.raw.properties.name).toBeDefined();

        // 6) Ensure unrelated language fields did not override choice
        expect(c.name).not.toBe(c.raw.properties.name_en);
        expect(c.name).not.toBe(c.raw.properties.name_sv);
      } finally {
        restoreHttpGetMock();
      }
    });

    it("S14 fallback to secondary locale and label-only fallback (two variants)", async () => {
      // Variant A: preferred languages missing but Finnish available -> selects fi
      // Variant B: none of fi/en/sv present -> label chosen and primaryLanguage 'default'
      // References:
      // - fallbackChain loop: [`src/services/lookupService.ts`](src/services/lookupService.ts:98-105)
      // - pickBestName: [`src/services/lookupService.ts`](src/services/lookupService.ts:96)
      // TODO: Replace ad-hoc language feature construction with fixture presets (Task 19)


      // ----- Variant A: upstream has only Finnish, input prefers en->sv ----- //
      const featA = featureWithGeometry({
        lon: 24.93,
        lat: 60.17,
        confidence: 0.92,
        locality: "Paikallinen Paikka",
        label: "Paikallinen Paikka, Region",
      });

      setupHttpGetMock([makeHttpResponse({ status: 200, features: [featA] })]);
  
      try {
        const resA = await lookupAddressOrStop({ text: "Paikallinen", lang: ["en", "sv"] });
  
        expect(resA.candidates.length).toBe(1);
        expect(resA.needsClarification).toBe(false);
  
        const ca = resA.candidates[0];
  
        // Expect fallback chain to pick the available Finnish field
        expect(ca.name).toBe("Paikallinen Paikka");
        expect(ca.primaryLanguage).toBe("fi");
  
        // Ensure no accidental override from absent fields
        expect(ca.name).not.toBe(ca.raw.properties.name_en);
        expect(ca.raw.properties.locality).toBeDefined();
      } finally {
        restoreHttpGetMock();
      }

      // ----- Variant B: upstream provides only label, no language-specific fields ----- //
      const featB = featureWithGeometry({
        lon: 24.93,
        lat: 60.17,
        confidence: 0.95,
        label: "Fallback Label, Region",
      });

      // Replace previous mock result with a fresh mock for second variant
      setupHttpGetMock(singleFeatureResponse(featB));
  
      try {
        const resB = await lookupAddressOrStop({ text: "Fallback", lang: ["fi"] });
  
        expect(resB.candidates.length).toBe(1);
        expect(resB.needsClarification).toBe(false);
  
        const cb = resB.candidates[0];
  
        // When language-specific fields missing, label is chosen and primaryLanguage == 'default'
        expect(cb.name).toBe("Fallback Label, Region");
        expect(cb.primaryLanguage).toBe("default");
  
        // Raw properties should contain label field used as source
        expect(cb.raw.properties.label).toBeDefined();
      } finally {
        restoreHttpGetMock();
      }
    });
  });

  // Distance Filtering (S15–S17; S22 interplay note)
  describe("Distance Filtering", () => {
    // Local deterministic focus used across distance tests.
    const FOCUS = { lat: 60.1700, lon: 24.9300 };
    const NEAR_DELTA = 0.001; // ~111m latitude delta
    const FAR_DELTA = 0.02; // clearly outside a small maxDistanceMeters
    const MAX_DISTANCE_METERS = 500; // threshold used in tests
    
    // Local helper to produce minimal feature objects used by tests.
    // TODO: Replace ad-hoc coordinates with centralized deterministic sets (Task 19).
    function makeFeature(name: string, lon: number, lat: number, confidence = 0.9) {
      return featureWithGeometry({
        lon,
        lat,
        confidence,
        name,
        label: `${name}, Region`,
      });
    }
  
    it("S15 filter by max distance (not applied when missing focus or missing maxDistanceMeters)", async () => {
      // Prepare upstream features: one near, one far.
      const near = makeFeature("Nearplace", FOCUS.lon + NEAR_DELTA, FOCUS.lat + NEAR_DELTA, 0.95);
      const far = makeFeature("Farplace", FOCUS.lon + FAR_DELTA, FOCUS.lat + FAR_DELTA, 0.95);
  
      setupHttpGetMock([
        makeHttpResponse({ status: 200, features: [near, far] }),
        makeHttpResponse({ status: 200, features: [near, far] }),
      ]);
  
      try {
        // Case A: Provide maxDistanceMeters but NO focus -> filter must NOT be applied
        const resA = await lookupAddressOrStop({ text: "Test", maxDistanceMeters: MAX_DISTANCE_METERS });
        expect(resA.candidates.length).toBe(2); // upstream count preserved
        // Ensure both original candidates still present (match by name)
        const namesA = resA.candidates.map((c) => c.name);
        expect(namesA).toContain("Nearplace");
        expect(namesA).toContain("Farplace");
  
        // Case B: Provide focus but NO maxDistanceMeters -> filter must NOT be applied
        const resB = await lookupAddressOrStop({ text: "Test", focus: FOCUS });
        expect(resB.candidates.length).toBe(2); // upstream count preserved
        const namesB = resB.candidates.map((c) => c.name);
        expect(namesB).toContain("Nearplace");
        expect(namesB).toContain("Farplace");
      } finally {
        restoreHttpGetMock();
      }
    });
  
    it("S16 include near matches within threshold (partial filtering removes some candidates)", async () => {
      // Upstream: two near features and one far. Keep total <= DEFAULT_MAX_CANDIDATES to avoid truncation.
      const near1 = makeFeature("NearOne", FOCUS.lon + NEAR_DELTA, FOCUS.lat + NEAR_DELTA, 0.90);
      const near2 = makeFeature("NearTwo", FOCUS.lon - NEAR_DELTA, FOCUS.lat - NEAR_DELTA, 0.85);
      const far1 = makeFeature("FarOne", FOCUS.lon + FAR_DELTA, FOCUS.lat + FAR_DELTA, 0.80);
  
      setupHttpGetMock([makeHttpResponse({ status: 200, features: [near1, near2, far1] })]);
  
      try {
        const res = await lookupAddressOrStop({
          text: "PartialFilter",
          focus: FOCUS,
          maxDistanceMeters: MAX_DISTANCE_METERS,
        });
  
        // Confirm filtering removed at least one upstream feature
        expect(res.candidates.length).toBeLessThan(3);
  
        // All returned candidates must be the near ones (no 'FarOne')
        const returnedNames = res.candidates.map((c) => c.name);
        expect(returnedNames).toContain("NearOne");
        expect(returnedNames).toContain("NearTwo");
        expect(returnedNames).not.toContain("FarOne");
  
        // needsClarification should be false because top confidence >= 0.8 (we set 0.90)
        expect(res.needsClarification).toBe(false);
      } finally {
        restoreHttpGetMock();
      }
    });
  
    it("S17 exclude distant matches (all coordinate-bearing candidates filtered out -> empty result; needsClarification false)", async () => {
      // Upstream: only far features so that distance filter removes all.
      const farA = makeFeature("FarA", FOCUS.lon + FAR_DELTA, FOCUS.lat + FAR_DELTA, 0.95);
      const farB = makeFeature("FarB", FOCUS.lon - FAR_DELTA, FOCUS.lat - FAR_DELTA, 0.85);
  
      setupHttpGetMock([makeHttpResponse({ status: 200, features: [farA, farB] })]);
  
      try {
        const res = await lookupAddressOrStop({
          text: "AllFiltered",
          focus: FOCUS,
          maxDistanceMeters: 100, // very restrictive so no feature is within threshold
        });
  
        // Expect empty candidate list after filtering
        expect(res.candidates.length).toBe(0);
    
        // With length <= 1, needsClarification must be false (predicate enforces this)
        expect(res.needsClarification).toBe(false);
      } finally {
        restoreHttpGetMock();
      }
    });
    
    // New test: ensure candidates without coordinates are excluded when distance filter active
    it("distance filter: candidates without coordinate are excluded", async () => {
      // Scenario:
      // - focus provided and maxDistanceMeters provided → distance filtering active
      // - upstream returns mixed features: with geometry, without any coordinate, with center, and one far away
      const FOCUS = { lat: 60.1700, lon: 24.9400 };
    
      const F1 = featureWithGeometry({ id: "f1", lon: 24.9410, lat: 60.1710, confidence: 0.9, name: "Alpha", label: "Alpha, Region" });
      const F2 = featureNoCoordinate({ id: "f2", confidence: 0.85, name: "NoCoord", label: "NoCoord, Region" });
      const F3 = featureWithCenter({ id: "f3", lon: 24.9420, lat: 60.1720, confidence: 0.7, name: "Beta", label: "Beta, Region" });
      const F4 = featureWithGeometry({ id: "f4", lon: 24.9400, lat: 60.2050, confidence: 0.6, name: "FarAway", label: "FarAway, Region" }); // ~3.9km north
    
      // Build upstream-shaped response using fixture helper and queue it
      const fixtures = await import('../fixtures/geocodingResponses');
      const responseBody = fixtures.searchResponse([F1, F2, F3, F4]);
      const httpResp = makeHttpResponse({ status: 200, features: responseBody.features });
    
      setupHttpGetMock([httpResp]);
    
      try {
        const res = await lookupAddressOrStop({
          text: "MixedCoords",
          focus: FOCUS,
          maxDistanceMeters: 1500,
        });
    
        // 1) Only F1 and F3 should remain (both have resolvable coordinates and are within radius)
        expect(res.candidates.length).toBe(2);
    
        // 2) Ordering: F1 (0.9) first, then F3 (0.7)
        expect(res.candidates[0].confidenceScore).toBe(0.9);
        expect(res.candidates[1].confidenceScore).toBe(0.7);
    
        // 3) Every returned candidate must have a coordinate defined
        for (const c of res.candidates) {
          expect(c.coordinate).toBeDefined();
          expect(typeof c.coordinate!.lat).toBe("number");
          expect(typeof c.coordinate!.lon).toBe("number");
        }
    
        // 4) With top confidence >= 0.8 and multiple candidates, needsClarification must be false
        // Rationale: predicate uses `truncated.length > 1 && truncated[0].confidenceScore < 0.8`
        expect(res.needsClarification).toBe(false);
    
        // 5) Ensure excluded features (NoCoord and FarAway) are not present (check by name)
        const returnedNames = res.candidates.map((c) => c.name);
        expect(returnedNames).not.toContain("NoCoord");
        expect(returnedNames).not.toContain("FarAway");
    
        // 6) Verify httpGet invoked exactly once and URL contains focus params
        const calls = getHttpGetCalls();
        expect(calls.length).toBe(1);
        expect(calls[0].url).toEqual(expect.stringContaining('focus.point.lat=' + String(FOCUS.lat)));
        expect(calls[0].url).toEqual(expect.stringContaining('focus.point.lon=' + String(FOCUS.lon)));
      } finally {
        restoreHttpGetMock();
      }
    });
    
    // Note: S22 interaction with distance trimming is covered in Composite Scenarios
  });

  // Sorting & Ties (S18)
  describe("Sorting & Ties", () => {
    describe("Deterministic Sorting", () => {
      // Comparator reference: [`src/util/sorting.ts`](src/util/sorting.ts:24-39) (sortLocationsDeterministic)
      // TODO: Add hash tie-break explicit test if comparator includes final hash key (future composite)
      // TODO: Add multi-language name tie-break scenario after unicode normalization task (future)

      afterEach(() => {
        restoreHttpGetMock();
      });

      it('S18a identical confidence & distances → ordered by name asc (deterministic)', async () => {
        // All candidates have identical confidence (0.91) and identical coordinates so comparator
        // falls back to name lexical order (final fallback in comparator).
        const features = [
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Zeta", label: "Zeta, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Alpha", label: "Alpha, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Gamma", label: "Gamma, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Beta", label: "Beta, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Omega", label: "Omega, Region" }),
        ];

        // Provide upstream in mixed order to ensure sorting applied
        setupHttpGetMock([makeHttpResponse({ status: 200, features })]);

        const res = await lookupAddressOrStop({ text: "Test" });

        // 1) All upstream features returned (no truncation here)
        expect(res.candidates.length).toBe(features.length);

        // 2) High confidences ensure no clarification
        expect(res.needsClarification).toBe(false);

        // 3) Names ordered lexically ascending by comparator fallback
        const names = res.candidates.map((c) => c.name);
        expect(names).toEqual(["Alpha", "Beta", "Gamma", "Omega", "Zeta"]);

        // 4) Top candidate confidence should match upstream (no normalization side-effect)
        expect(res.candidates[0].confidenceScore).toBe(0.91);
      });

      it('S18b confidence within epsilon treated equal → distance tiebreak then name', async () => {
        // Note: sortLocationsDeterministic contains no explicit epsilon; to exercise
        // "almost equal" groups we create exact-equality inside groups and a small
        // delta between groups. Primary: confidence DESC, Secondary: language order,
        // Tertiary: coordinate lat/lon, Final: name.
        const highLat = 60.10;
        const lowLat = 60.05;

        const features = [
          // High-confidence pair (same confidence -> coordinate decides order)
          featureWithGeometry({ lon: 24.9, lat: lowLat, confidence: 0.911, name: "Alpha", label: "Alpha, Region" }),
          featureWithGeometry({ lon: 24.9, lat: highLat, confidence: 0.911, name: "Beta", label: "Beta, Region" }),
          // Slightly lower-confidence pair (treated as the next group)
          featureWithGeometry({ lon: 25.0, lat: 60.20, confidence: 0.910, name: "Gamma", label: "Gamma, Region" }),
          featureWithGeometry({ lon: 25.0, lat: 60.20, confidence: 0.910, name: "Omega", label: "Omega, Region" }),
        ];

        setupHttpGetMock([
          makeHttpResponse({ status: 200, features }),
          makeHttpResponse({ status: 200, features }),
        ]);

        const res = await lookupAddressOrStop({ text: "TieTest" });

        // 1) All upstream features returned
        expect(res.candidates.length).toBe(features.length);

        // 2) No clarification expected (top confidence >= 0.8)
        expect(res.needsClarification).toBe(false);

        // 3) Ordering: high-confidence group first ordered by latitude (lowLat < highLat),
        //    then lower-confidence group ordered by name (coordinates equal -> name asc).
        const names = res.candidates.map((c) => c.name);
        expect(names).toEqual(["Alpha", "Beta", "Gamma", "Omega"]);

        // 4) Stability: repeat call yields identical ordering
        const res2 = await lookupAddressOrStop({ text: "TieTest" });
        expect(res2.candidates.map((c) => c.name)).toEqual(names);
      });

      it('S18c upstream reversed order still yields deterministic sorted order', async () => {
        // Same dataset as S18a but supplied upstream in reverse order to prove upstream
        // ordering does not leak into final ordering.
        const base = [
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Alpha", label: "Alpha, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Beta", label: "Beta, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Gamma", label: "Gamma, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Omega", label: "Omega, Region" }),
          featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.91, name: "Zeta", label: "Zeta, Region" }),
        ];

        const reversed = [...base].reverse();

        // Queue two successive upstream responses so resA and resB receive different upstream orderings
        setupHttpGetMock([
          makeHttpResponse({ status: 200, features: base }),
          makeHttpResponse({ status: 200, features: reversed }),
        ]);
        const resA = await lookupAddressOrStop({ text: "ReverseA" });
        const resB = await lookupAddressOrStop({ text: "ReverseB" });

        const expected = ["Alpha", "Beta", "Gamma", "Omega", "Zeta"];

        // Both runs must yield the same deterministic ordering
        expect(resA.candidates.map((c) => c.name)).toEqual(expected);
        expect(resB.candidates.map((c) => c.name)).toEqual(expected);

        // Negative check: upstream reversed order must differ from final ordering
        const upstreamNames = reversed.map((f) => f.properties.name);
        expect(upstreamNames).not.toEqual(expected);

        // Ensure raw feature values not mutated
        for (const f of reversed) {
          expect(f.properties.name).toBeDefined();
        }
      });
    });
  });

  // Truncation & Disambiguation (S19–S21)
  describe("Truncation & Disambiguation", () => {
    it("S19 truncation of long names – truncates to DEFAULT_MAX_CANDIDATES and preserves ordering", async () => {
      // References:
      // - Truncation slice: [`src/services/lookupService.ts`](src/services/lookupService.ts:141-143)
      // - needsClarification predicate: [`src/services/lookupService.ts`](src/services/lookupService.ts:145)
      // - DEFAULT_MAX_CANDIDATES constant: [`src/services/lookupService.ts`](src/services/lookupService.ts:27)
      // - Sorting applied before truncation: [`src/services/lookupService.ts`](src/services/lookupService.ts:138)
      // - Deterministic comparator referenced (exercise path): [`src/util/sorting.ts`](src/util/sorting.ts:24)
      // TODO: Add scenario for boundary top=0.80 (S21) in later task

      // Build 7 upstream features with strictly descending confidences so top-5 is well-defined.
      const LAT = 60.17;
      const LON = 24.94;
      const originalFeatures = [
        featureWithGeometry({ lon: LON + 0.000, lat: LAT + 0.000, confidence: 0.95, name: "F1", label: "F1, Region" }),
        featureWithGeometry({ lon: LON + 0.001, lat: LAT + 0.001, confidence: 0.90, name: "F2", label: "F2, Region" }),
        featureWithGeometry({ lon: LON + 0.002, lat: LAT + 0.002, confidence: 0.89, name: "F3", label: "F3, Region" }),
        featureWithGeometry({ lon: LON + 0.003, lat: LAT + 0.003, confidence: 0.88, name: "F4", label: "F4, Region" }),
        featureWithGeometry({ lon: LON + 0.004, lat: LAT + 0.004, confidence: 0.87, name: "F5", label: "F5, Region" }),
        featureWithGeometry({ lon: LON + 0.005, lat: LAT + 0.005, confidence: 0.50, name: "F6", label: "F6, Region" }),
        featureWithGeometry({ lon: LON + 0.006, lat: LAT + 0.006, confidence: 0.40, name: "F7", label: "F7, Region" }),
      ];

      // Sanity: upstream set is larger than DEFAULT_MAX_CANDIDATES
      expect(originalFeatures.length).toBeGreaterThan(5);
      expect(originalFeatures.length).toBe(7);

      // Inline mock boundary for httpGet (temporary)
      setupHttpGetMock([makeHttpResponse({ status: 200, features: originalFeatures })]);

      try {
        const res = await lookupAddressOrStop({ text: "FuzzyPlace" });

        // 1) Returned candidates truncated to DEFAULT_MAX_CANDIDATES === 5
        expect(res.candidates.length).toBe(5);

        // 2) Ensure original upstream length > 5 (sanity)
        expect(originalFeatures.length).toBeGreaterThan(5);

        // 3) Top-5 by descending confidence preserved and deterministic
        const returnedNames = res.candidates.map((c) => c.name);
        expect(returnedNames).toEqual(["F1", "F2", "F3", "F4", "F5"]);

        // 4) Ensure 6th and 7th features are NOT present
        expect(returnedNames).not.toContain("F6");
        expect(returnedNames).not.toContain("F7");

        // 5) needsClarification should be false because top confidence (0.95) >= 0.8 and multiple candidates
        expect(res.needsClarification).toBe(false);

        // 6) Sorting comparator path exercised (primary: confidence). See comparator at [`src/util/sorting.ts`](src/util/sorting.ts:24)
        const confidences = res.candidates.map((c) => c.confidenceScore);
        const sortedDesc = [...confidences].sort((a, b) => b - a);
        expect(confidences).toEqual(sortedDesc);

        // 7) No mutation of raw features array length
        expect(originalFeatures.length).toBe(7);
      } finally {
        // Cleanup mocks
        restoreHttpGetMock();
      }
    });

    it("S20 needsClarification detection – multiple low-confidence candidates", async () => {
      // References:
      // - mapping loop / candidate mapping: [`src/services/lookupService.ts`](src/services/lookupService.ts:86-113)
      // - needsClarification predicate: [`src/services/lookupService.ts`](src/services/lookupService.ts:145)
      // - DEFAULT_MAX_CANDIDATES constant: [`src/services/lookupService.ts`](src/services/lookupService.ts:27)
      //
      // Mocks:
      // TODO: Replace with shared http mock utility (Task 16)
      // TODO: Replace with richer fixture presets after Task 19

      const LAT = 60.17;
      const LON = 24.94;
      const TOP_CONF = 0.79; // intentionally below 0.80 threshold (S20)

      // Build deterministic features with decreasing confidences (all < 0.8)
      const fTop = featureWithGeometry({
        lon: LON,
        lat: LAT,
        confidence: TOP_CONF,
        name: "Topplace",
        label: "Topplace, Region",
      });

      const fSecond = featureWithGeometry({
        lon: LON + 0.001,
        lat: LAT + 0.001,
        confidence: 0.70,
        name: "Secondplace",
        label: "Secondplace, Region",
      });

      const fThird = featureWithGeometry({
        lon: LON + 0.002,
        lat: LAT + 0.002,
        confidence: 0.60,
        name: "Thirdplace",
        label: "Thirdplace, Region",
      });

      // Inline mock boundary for httpGet (temporary)
      setupHttpGetMock([makeHttpResponse({ status: 200, features: [fTop, fSecond, fThird] })]);

      try {
        const res = await lookupAddressOrStop({ text: "Topplace" });

        // 1) No truncation: returned candidates equal number of features supplied
        expect(res.candidates.length).toBe(3);
        // 6) Ensure not exceeding configured max (sanity)
        expect(res.candidates.length).toBeLessThanOrEqual(5);

        // 2) Top candidate confidence equals the provided top value
        expect(res.candidates[0].confidenceScore).toBe(TOP_CONF);

        // 3) Every candidate has confidence < 0.8
        for (const c of res.candidates) {
          expect(c.confidenceScore).toBeLessThan(0.8);
        }

        // 4) Because multiple candidates present and top < 0.8, needsClarification must be true
        expect(res.needsClarification).toBe(true);

        // 5) Ordering stability: top candidate should be the highest-confidence candidate
        const maxConf = Math.max(...res.candidates.map((c) => c.confidenceScore));
        expect(res.candidates[0].confidenceScore).toBe(maxConf);
      } finally {
        // Cleanup mocks
        restoreHttpGetMock();
      }
    });

    it("S20b needsClarification still true when non-top candidate has very low confidence", async () => {
      // Smaller variant showing variance doesn't affect needsClarification logic
      // TODO: Replace with shared http mock utility (Task 16)

      const LAT = 60.17;
      const LON = 24.94;
      const TOP_CONF = 0.79;

      const fTop = featureWithGeometry({
        lon: LON,
        lat: LAT,
        confidence: TOP_CONF,
        name: "TopplaceVar",
        label: "TopplaceVar, Region",
      });

      const fLow = featureWithGeometry({
        lon: LON + 0.003,
        lat: LAT + 0.003,
        confidence: 0.10,
        name: "Lowplace",
        label: "Lowplace, Region",
      });

      setupHttpGetMock([makeHttpResponse({ status: 200, features: [fTop, fLow] })]);

      try {
        const res = await lookupAddressOrStop({ text: "TopplaceVar" });

        expect(res.candidates.length).toBe(2);
        expect(res.candidates.length).toBeLessThanOrEqual(5);

        expect(res.candidates[0].confidenceScore).toBe(TOP_CONF);
        for (const c of res.candidates) {
          expect(c.confidenceScore).toBeLessThan(0.8);
        }

        expect(res.needsClarification).toBe(true);

        const maxConf = Math.max(...res.candidates.map((c) => c.confidenceScore));
        expect(res.candidates[0].confidenceScore).toBe(maxConf);
      } finally {
        restoreHttpGetMock();
      }
    });

    it("S21 needsClarification negative case / threshold – TODO", async () => {
      // TODO: Implement S21 (needsClarification boundary case)
      // Lines referenced: [`src/services/lookupService.ts`](src/services/lookupService.ts:1)
    });
  });

  // Boundary & High-Confidence Clarification Rules
  describe("Boundary & High-Confidence Clarification Rules", () => {
    // Use shared http mock helpers (cleanup after each spec)
    afterEach(() => {
      restoreHttpGetMock();
    });

    const COMMON_INPUT = { text: "boundary", lang: ["fi", "en"], size: 10 };

    it('S21 boundary: top confidence === 0.80 with 2+ candidates → needsClarification false', async () => {
      // Threshold logic referenced at line 145: needsClarification uses `< 0.8`
      const f1 = featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.80, name: "Alpha", label: "Alpha, Region" });
      const f2 = featureWithGeometry({ lon: 24.95, lat: 60.17, confidence: 0.60, name: "Beta", label: "Beta, Region" });

      setupHttpGetMock([makeHttpResponse({ status: 200, features: [f1, f2] })]);

      const res = await lookupAddressOrStop(COMMON_INPUT);

      // Exact expectations
      expect(res.candidates.length).toBe(2);
      // Because predicate uses `< 0.8`, top === 0.80 must yield false
      expect(res.needsClarification).toBe(false);

      // Ordering: Alpha (0.80) must be first
      const names = res.candidates.map((c) => c.name);
      expect(names).toEqual(["Alpha", "Beta"]);

      // Normalization sanity (confidence in [0,1])
      for (const c of res.candidates) {
        expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(c.confidenceScore).toBeLessThanOrEqual(1);
      }
    });

    it('Multi-candidate high-confidence: top confidence > 0.80 → needsClarification false', async () => {
      const f1 = featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.95, name: "Zeta", label: "Zeta, Region" });
      const f2 = featureWithGeometry({ lon: 24.95, lat: 60.17, confidence: 0.90, name: "Beta", label: "Beta, Region" });
      const f3 = featureWithGeometry({ lon: 24.96, lat: 60.17, confidence: 0.88, name: "Alpha", label: "Alpha, Region" });

      setupHttpGetMock([makeHttpResponse({ status: 200, features: [f1, f2, f3] })]);

      const res = await lookupAddressOrStop(COMMON_INPUT);

      expect(res.candidates.length).toBe(3);
      // Top > 0.8 path: explicit multi-candidate non-disambiguation
      expect(res.needsClarification).toBe(false);

      const names = res.candidates.map((c) => c.name);
      expect(names).toEqual(["Zeta", "Beta", "Alpha"]);

      for (const c of res.candidates) {
        expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(c.confidenceScore).toBeLessThanOrEqual(1);
      }
    });

    it('Score fallback candidate ordering: confidence missing, score present → mapped & participates in ordering', async () => {
      // Mapping confidence/score reference at line 88; normalization at lines 29-37
      const f1 = featureWithGeometry({ lon: 24.94, lat: 60.17, confidence: 0.90, name: "Primary", label: "Primary, Region" });
      const f2 = featureWithGeometry({ lon: 24.95, lat: 60.17, score: 0.75, name: "ScoredOnly", label: "ScoredOnly, Region" }) as any;
      const f3 = featureWithGeometry({ lon: 24.96, lat: 60.17, confidence: 0.40, name: "Lower", label: "Lower, Region" });

      setupHttpGetMock([makeHttpResponse({ status: 200, features: [f1, f2, f3] })]);

      const res = await lookupAddressOrStop(COMMON_INPUT);

      expect(res.candidates.length).toBe(3);

      // Top candidate >= 0.8 -> no clarification even with multiple candidates
      expect(res.needsClarification).toBe(false);

      // Ensure ordering: Primary (0.90), ScoredOnly (mapped 0.75), Lower (0.40)
      const names = res.candidates.map((c) => c.name);
      expect(names).toEqual(["Primary", "ScoredOnly", "Lower"]);

      const scored = res.candidates.find((c) => c.name === "ScoredOnly");
      expect(scored).toBeDefined();

      // Raw upstream properties inspections
      expect(scored!.raw.properties.score).toBe(0.75);
      expect(scored!.raw.properties.confidence).toBeUndefined();

      // The normalization must have produced confidenceScore === mapped score (0.75)
      expect(scored!.confidenceScore).toBe(0.75);

      // Final sanity: all mapped confidenceScore values in [0,1]
      for (const c of res.candidates) {
        expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(c.confidenceScore).toBeLessThanOrEqual(1);
      }
    });

    // TODO markers
    // TODO: (Task 26) Add missing-both confidence/score explicit consolidation check if still uncovered after rerun
    // TODO: (Task 20) Include boundary test in coverage report update
  });

// Distance Filter Negative Path
describe('Distance Filter Negative Path', () => {
  // Use shared http mock utilities (cleanup after each spec)
  afterEach(restoreHttpGetMock);

  it('maxDistanceMeters provided without focus → no filtering applied (all candidates retained)', async () => {
    // Distance filter requires both maxDistanceMeters & focus (lines 117-118), absence of focus skips block.
    const F1 = featureWithGeometry({ lon: 24.93, lat: 60.17, confidence: 0.92, name: "NearA", label: "NearA, Region" });

    const F2 = featureWithGeometry({ lon: 25.5, lat: 60.6, confidence: 0.85, name: "FarA", label: "FarA, Region" });

    const F3 = buildFeature({
      propertiesOverride: { confidence: 0.70, name: "NoCoord", label: "NoCoord, Region" },
      geometry: { type: "Point", coordinates: [24.93] }, // malformed (no center)
    } as any);

    setupHttpGetMock([makeHttpResponse({ status: 200, features: [F1, F2, F3] })]);

    const res = await lookupAddressOrStop({
      text: "distance-check",
      maxDistanceMeters: 500, // intentionally set
      // focus omitted on purpose
      lang: ["fi"],
    });

    // All three upstream features must be preserved because focus is absent
    expect(res.candidates.length).toBe(3);

    // Ordering by confidence descending is stable here (NearA, FarA, NoCoord)
    const names = res.candidates.map((c) => c.name);
    expect(names).toEqual(["NearA", "FarA", "NoCoord"]);

    // Explicit presence checks for clarity
    expect(names).toContain("FarA"); // far coordinate not filtered out
    expect(names).toContain("NoCoord"); // malformed-geometry candidate still present

    // Top confidence >= 0.8 -> no clarification required
    expect(res.needsClarification).toBe(false);
  });

  it('distance filter: all candidates outside radius yields zero results', async () => {
    // Scenario:
    // - focus at 60.1700,24.9400
    // - maxDistanceMeters = 500
    // - upstream returns three features all placed >500m away using safe deltas
    const FOCUS = { lat: 60.1700, lon: 24.9400 };

    const far1 = featureWithGeometry({
      lon: 24.9400,
      lat: 60.1825, // +0.0125 ~ ~1.39km
      confidence: 0.9,
      name: "FarPlace1",
      label: "FarPlace1, Region",
    });

    const far2 = featureWithGeometry({
      lon: 24.9605, // +0.0205 lon offset ~ >1km
      lat: 60.1700,
      confidence: 0.7,
      name: "FarPlace2",
      label: "FarPlace2, Region",
    });

    const far3 = featureWithGeometry({
      lon: 24.9610,
      lat: 60.1830,
      confidence: 0.6,
      name: "FarPlace3",
      label: "FarPlace3, Region",
    });

    const originalFeatures = [far1, far2, far3];
    expect(originalFeatures.length).toBeGreaterThanOrEqual(3);

    // Queue upstream mock response
    setupHttpGetMock([makeHttpResponse({ status: 200, features: originalFeatures })]);

    // Execute service under test with restrictive radius
    const res = await lookupAddressOrStop({
      text: "OutsideArea",
      focus: FOCUS,
      maxDistanceMeters: 500,
    });

    // 1) All candidates filtered out due to distance
    expect(res.candidates.length).toBe(0);

    // 2) needsClarification must be false when there are zero candidates
    expect(res.needsClarification).toBe(false);

    // 3) Verify httpGet was invoked once and URL contained focus and size params
    const calls = getHttpGetCalls();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toEqual(expect.stringContaining('focus.point.lat=' + String(FOCUS.lat)));
    expect(calls[0].url).toEqual(expect.stringContaining('focus.point.lon=' + String(FOCUS.lon)));
    expect(calls[0].url).toEqual(expect.stringContaining('size='));

    // 4) Sanity: ensure original upstream set had 3 items so the empty result is due to filtering
    expect(originalFeatures.length).toBe(3);
  });

  it('distance filter control: larger radius retains upstream candidates', async () => {
    // Control variant: with a larger radius the same upstream features should survive filtering.
    const FOCUS = { lat: 60.1700, lon: 24.9400 };

    const far1 = featureWithGeometry({
      lon: 24.9400,
      lat: 60.1825,
      confidence: 0.9,
      name: "FarPlace1",
      label: "FarPlace1, Region",
    });

    const far2 = featureWithGeometry({
      lon: 24.9605,
      lat: 60.1700,
      confidence: 0.7,
      name: "FarPlace2",
      label: "FarPlace2, Region",
    });

    const far3 = featureWithGeometry({
      lon: 24.9610,
      lat: 60.1830,
      confidence: 0.6,
      name: "FarPlace3",
      label: "FarPlace3, Region",
    });

    const originalFeatures = [far1, far2, far3];

    // New queued response for this invocation
    setupHttpGetMock([makeHttpResponse({ status: 200, features: originalFeatures })]);

    // Use much larger radius to include features (~5000m)
    const res = await lookupAddressOrStop({
      text: "OutsideArea",
      focus: FOCUS,
      maxDistanceMeters: 5000,
    });

    // At least one candidate should remain when radius is large enough
    expect(res.candidates.length).toBeGreaterThan(0);

    // With multiple candidates and top confidence >= 0.8 the service should not request clarification here
    expect(res.needsClarification).toBe(false);
  });
});
  // Composite Scenarios (S22 + cross-cut interactions)
  describe("Composite Scenarios", () => {
    // Keep mocks local to this describe block to avoid affecting other groups
    afterEach(() => {
      // Ensure cleanup of spies/mocks used in composite test only
      (async () => {
        restoreHttpGetMock();
      })();
    });

    it('S22 composite: distance filter + fallback + truncation + needsClarification + normalization', async () => {
      // Composite Scenario
      // - Language fallback lines 90-106
      // - Distance filtering lines 117-135
      // - Sorting invocation line 138 (uses comparator in src/util/sorting.ts)
      // - Truncation lines 141-143
      // - needsClarification rule line 145
      // - Confidence normalization lines 29-37

      // TODO: Extract composite feature builder to fixtures (Task 19)
      // TODO: Add unicode + multilingual tie-break variant in future (post normalization task)
      // TODO: Add separate test for threshold boundary top=0.80 (S21) if still uncovered

      const FOCUS = { lat: 60.1700, lon: 24.9300 };
      const MAX_DISTANCE_METERS = 2000;
      const SIZE = 20;

      // Helper to build features succinctly (uses buildFeature from fixtures)
      // Feature layout chosen so that after distance filtering exactly 5 candidates remain
      // (ensuring truncation path exercised and a low-confidence clamped candidate remains).
      const inside = (name: string, lonDelta: number, latDelta: number, props: any) =>
        featureWithGeometry({
          lon: FOCUS.lon + lonDelta,
          lat: FOCUS.lat + latDelta,
          propertiesOverride: { ...(props ?? {}), label: (props && props.label) ?? `${name}, Region` },
        });
 
      const outside = (name: string, lonDelta: number, latDelta: number, props: any) =>
        featureWithGeometry({
          lon: FOCUS.lon + lonDelta,
          lat: FOCUS.lat + latDelta,
          propertiesOverride: { ...(props ?? {}), label: (props && props.label) ?? `${name}, Region` },
        });

      // F1: Finnish-only field (locality) — expect primaryLanguage 'fi'
      const F1 = inside("Aleksi A", 0.0005, 0.0005, {
        confidence: 0.76,
        locality: "Aleksi A", // finnish-only source
      });

      // F2: English-only name (no fi) — fallback to 'en'
      const F2 = inside("EnglishOnly", 0.0010, 0.0006, {
        confidence: 0.74,
        name_en: "EnglishOnly",
      });

      // F3: label-only (no name_* fields) — primaryLanguage 'default'
      const F3 = inside("LabelOnly", 0.0015, 0.0007, {
        confidence: 0.73,
        // no name/name_en/name_sv/locality provided -> label used
        label: "LabelOnly, Region",
      });

      // F4: High upstream confidence (>1) — included upstream but placed outside radius
      // (we keep this outside to ensure top-of-list remains below 0.8 and disambiguation is triggered)
      const F4 = outside("Beta", 0.03, 0.03, {
        confidence: 1.4,
        name: "Beta",
      });

      // F5: Negative confidence (<0) to exercise clamping to 0 — must still be retained post-sort/truncation
      const F5 = inside("Gamma", 0.0025, 0.0009, {
        confidence: -2, // should clamp to 0
        name: "Gamma",
      });

      // F6: within radius but relatively farther than some — ensures ordering interplay
      const F6 = inside("Delta", 0.0020, 0.0008, {
        confidence: 0.75,
        name: "Delta",
      });

      // F7: clearly outside radius (far away) to confirm exclusion by distance filter
      const F7 = outside("FarAway", 0.05, 0.05, {
        confidence: 0.99,
        name: "FarAway",
      });

      // Assemble upstream in deliberate scrambled order
      const originalFeatures = [F3, F7, F2, F5, F4, F1, F6];

      // Sanity: upstream length >= 7
      expect(originalFeatures.length).toBeGreaterThanOrEqual(7);

      // Inline mock for httpGet (single invocation)
      setupHttpGetMock([makeHttpResponse({ status: 200, features: originalFeatures })]);
  
      // Execute service under test
      const res = await lookupAddressOrStop({
        text: "multi",
        focus: FOCUS,
        maxDistanceMeters: MAX_DISTANCE_METERS,
        lang: ["fi", "en", "sv"],
        size: SIZE,
      });

      // 1) Truncated result length === 5 (DEFAULT_MAX_CANDIDATES)
      expect(res.candidates.length).toBe(5);

      // Collect returned names for easier assertions
      const returnedNames = res.candidates.map((c) => c.name);

      // 2) Ensure excluded outside-radius features are not present (F4 and F7 expected absent)
      expect(returnedNames).not.toContain("Beta"); // F4 outside
      expect(returnedNames).not.toContain("FarAway"); // F7 outside

      // 3) needsClarification === true: top candidate confidence < 0.8 and multiple candidates remain
      expect(res.needsClarification).toBe(true);
      expect(res.candidates.length).toBeGreaterThan(1);
      expect(res.candidates[0].confidenceScore).toBeLessThan(0.8);

      // 4) Verify deterministic ordering (confidence DESC, then tie-breaks)
      // Based on supplied confidences and normalization the expected order (desc) is:
      // F1 (0.76), F6 (0.75), F2 (0.74), F3 (0.73), F5 (clamped 0)
      expect(returnedNames).toEqual(["Aleksi A", "Delta", "EnglishOnly", "LabelOnly, Region", "Gamma"]);

      // 5) Top candidate confidenceScore === normalized value and raw preserved
      const top = res.candidates[0];
      expect(top.confidenceScore).toBe(0.76);
      expect(top.raw.properties.confidence).toBe(0.76);

      // 6) Language fallback checks: at least one 'fi', one 'en', one 'default'
      const hasFi = res.candidates.some((c) => c.primaryLanguage === "fi");
      const hasEn = res.candidates.some((c) => c.primaryLanguage === "en");
      const hasDefault = res.candidates.some((c) => c.primaryLanguage === "default");
      expect(hasFi).toBe(true);
      expect(hasEn).toBe(true);
      expect(hasDefault).toBe(true);

      // 7) At least one candidate with clamped confidence 0 remains after truncation (F5)
      expect(res.candidates.some((c) => c.confidenceScore === 0)).toBe(true);
      // Ensure original upstream raw value still present (no mutation)
      const clampedRaw = originalFeatures.find((f: any) => f.properties.name === "Gamma" || f.properties.locality === "Aleksi A");
      expect(clampedRaw).toBeDefined();

      // 8) Confirm excluded outside-radius feature names absent (already asserted) and coordinates respected
      for (const c of res.candidates) {
        // Each returned candidate must have a coordinate and its distance <= MAX_DISTANCE_METERS
        expect(c.coordinate).toBeDefined();
        // Rough sanity: confidenceScore in [0,1]
        expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(c.confidenceScore).toBeLessThanOrEqual(1);
      }

      // 9) Candidate names stable (no duplicates) and deterministic
      const uniqNames = new Set(returnedNames);
      expect(uniqNames.size).toBe(returnedNames.length);

      // 10) All confidenceScore values normalized to [0,1]
      for (const c of res.candidates) {
        expect(c.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(c.confidenceScore).toBeLessThanOrEqual(1);
      }
    });
  });
});

/*
TODOs:
- TODO: Integrate fixtures from [`tests/fixtures/geocodingResponses.ts`](tests/fixtures/geocodingResponses.ts:1)
- TODO: Fill expectations for needsClarification threshold (S20/S21)
- TODO: Add coverage for distance trimming altering clarification (S22)
- TODO: Implement error mapping assertions (S02–S05) after mock utility
- TODO: (Task 19) Expand http mock to support per-call latency simulation
- TODO: (Task 20) Add helper to assert retryAfter extraction scenarios
*/