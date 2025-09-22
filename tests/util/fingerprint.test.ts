import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as crypto from 'crypto';
import { fingerprintItinerary } from 'src/util/fingerprint';

describe('T026 — fingerprint hashing uniqueness & stability', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('realtime-field-stability: adding volatile fields should not change fingerprint', () => {
    const base = {
      legs: [
        { mode: 'BUS', departure: '2025-01-01T10:00:00Z', from: { id: 'stopA' }, to: { id: 'stopB' } },
        { mode: 'WALK', departure: '2025-01-01T10:05:00Z', from: { id: 'stopB' }, to: { id: 'stopC' } },
      ],
    };
    const mutated = JSON.parse(JSON.stringify(base));
    // Add typical realtime/volatile fields
    mutated.legs[0].delay = 30;
    mutated.legs[0].realtimeDelaySeconds = 30;
    mutated.legs[0].cancelled = false;
    mutated.legs[1].realtimeUpdateTs = '2025-01-01T09:59:00Z';
    mutated.legs[1].prediction = { status: 'estimated' };

    expect(fingerprintItinerary(base)).toBe(fingerprintItinerary(mutated));
  });

  it('separator/Unicode: components containing "|" or "~" do not cause accidental collisions', () => {
    const it1 = {
      legs: [{ mode: 'BUS', from: { id: 'a|b' }, to: { id: 'c' }, departure: '2025-01-01T10:00:00Z' }],
    };
    const it2 = {
      legs: [{ mode: 'BUS', from: { id: 'a' }, to: { id: 'b|c' }, departure: '2025-01-01T10:00:00Z' }],
    };
    // If components are escaped/encoded properly the two itineraries should NOT collide.
    expect(fingerprintItinerary(it1)).not.toBe(fingerprintItinerary(it2));

    // Unicode characters should also be handled deterministically
    const it3 = {
      legs: [{ mode: 'BUS', from: { id: 'stop🚏' }, to: { id: 'dst' }, departure: '2025-01-01T10:00:00Z' }],
    };
    const it4 = {
      legs: [{ mode: 'BUS', from: { id: 'stop🚑' }, to: { id: 'dst' }, departure: '2025-01-01T10:00:00Z' }],
    };
    expect(fingerprintItinerary(it3)).not.toBe(fingerprintItinerary(it4));
  });

  it('numeric epoch normalization: seconds vs milliseconds should be treated equivalently', () => {
    const seconds = 1700000000; // seconds
    const millis = 1700000000000; // milliseconds
    const itSec = { legs: [{ mode: 'BUS', departure: seconds, from: { id: 'A' }, to: { id: 'B' } }] };
    const itMs = { legs: [{ mode: 'BUS', departure: millis, from: { id: 'A' }, to: { id: 'B' } }] };
    expect(fingerprintItinerary(itSec)).toBe(fingerprintItinerary(itMs));
  });

  it('timezone-less ISO strings are treated as UTC (append Z)', () => {
    const noTz = { legs: [{ mode: 'BUS', departure: '2025-01-01T10:00:00', from: { id: 'A' }, to: { id: 'B' } }] };
    const withZ = { legs: [{ mode: 'BUS', departure: '2025-01-01T10:00:00Z', from: { id: 'A' }, to: { id: 'B' } }] };
    expect(fingerprintItinerary(noTz)).toBe(fingerprintItinerary(withZ));
  });

  it('empty itineraries: {} and {legs: []} produce explicit marker and stable fingerprint and differ from one empty leg', () => {
    const a = {};
    const b = { legs: [] };
    const withEmptyLeg = { legs: [{ mode: '', from: {}, to: {} }] };
    expect(fingerprintItinerary(a)).toBe(fingerprintItinerary(b));
    expect(fingerprintItinerary(a)).not.toBe(fingerprintItinerary(withEmptyLeg));
  });

  it('fallback hashing path: force fallback via env and ensure fp: fallback is deterministic', async () => {
    // Force the fallback path via environment variable before importing the module
    process.env.FINGERPRINT_FORCE_FALLBACK = '1';
    vi.resetModules();

    const mod = await import('src/util/fingerprint');
    const { fingerprintItinerary } = mod;

    const it = {
      legs: [{ mode: 'BUS', departure: '2025-01-01T10:00:00Z', from: { id: 'A' }, to: { id: 'B' } }],
    };
    const f1 = fingerprintItinerary(it);
    const f2 = fingerprintItinerary(it);

    expect(f1.startsWith('fp:')).toBe(true);
    expect(f1).toBe(f2);

    // Cleanup: remove env flag and reload original module for subsequent tests
    delete process.env.FINGERPRINT_FORCE_FALLBACK;
    vi.resetModules();
    await import('src/util/fingerprint');
  });
});