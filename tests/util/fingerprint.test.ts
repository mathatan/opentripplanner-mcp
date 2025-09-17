// tests/util/fingerprint.test.ts
import { describe, it, expect } from 'vitest';
import { fingerprintItinerary } from 'src/util/fingerprint';

describe('T026 — fingerprint hashing uniqueness & stability (placeholder tests)', () => {
  it('uniqueness: different leg sequences produce different fingerprints', () => {
    const itineraryA = { legs: [{ id: 'leg-1', mode: 'BUS', departure: '2025-01-01T10:00:00Z' }] };
    const itineraryB = { legs: [{ id: 'leg-2', mode: 'WALK', departure: '2025-01-01T10:00:00Z' }] };

    expect(fingerprintItinerary(itineraryA)).not.toBe(fingerprintItinerary(itineraryB));
  });

  it('stability: same input produces identical fingerprint across calls', () => {
    const itinerary = {
      legs: [
        { id: 'leg-1', mode: 'BUS', departure: '2025-01-01T10:00:00Z' },
        { id: 'leg-2', mode: 'WALK', departure: '2025-01-01T10:05:00Z' },
      ],
    };

    const f1 = fingerprintItinerary(itinerary);
    const f2 = fingerprintItinerary(itinerary);
    expect(f1).toBe(f2);
  });

  it('start time bucketing: departures within <2 minutes should produce same bucketed fingerprint when legs identical', () => {
    const baseLeg = { id: 'leg-1', mode: 'BUS' };
    const itineraryEarly = {
      legs: [{ ...baseLeg, departure: '2025-01-01T10:00:00Z' }],
    };
    const itineraryLate = {
      legs: [{ ...baseLeg, departure: '2025-01-01T10:01:30Z' }], // within 90s
    };

    expect(fingerprintItinerary(itineraryEarly)).toBe(fingerprintItinerary(itineraryLate));
  });

  it('deterministic ordering: switching leg order changes fingerprint', () => {
    const legA = { id: 'A', mode: 'BUS', departure: '2025-01-01T10:00:00Z' };
    const legB = { id: 'B', mode: 'TRAM', departure: '2025-01-01T10:10:00Z' };

    const itineraryAB = { legs: [legA, legB] };
    const itineraryBA = { legs: [legB, legA] };

    expect(fingerprintItinerary(itineraryAB)).not.toBe(fingerprintItinerary(itineraryBA));
  });
});