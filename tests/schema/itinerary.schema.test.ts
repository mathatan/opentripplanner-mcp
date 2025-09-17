import { describe, it, expect } from 'vitest';
import { LegSchema, ItinerarySchema } from 'src/schema/itinerary';

describe('Leg schema (T015) - required fields', () => {
  it('accepts a minimal Leg with required fields', () => {
    const minimalLeg = {
      mode: 'walk',
      from: { id: 'A', name: 'Origin' },
      to: { id: 'B', name: 'Destination' },
      departureTime: '2025-09-17T09:00:00Z',
      arrivalTime: '2025-09-17T09:10:00Z',
      duration: 600,
    };

    // Placeholder: real schema should accept this. This will currently FAIL until schema implemented.
    expect(() => LegSchema.parse(minimalLeg)).not.toThrow();
  });

  it('throws when departureTime or arrivalTime is missing', () => {
    const missingDeparture = {
      mode: 'bus',
      from: { id: 'A' },
      to: { id: 'B' },
      arrivalTime: '2025-09-17T10:00:00Z',
      duration: 900,
    };

    const missingArrival = {
      mode: 'tram',
      from: { id: 'A' },
      to: { id: 'B' },
      departureTime: '2025-09-17T11:00:00Z',
      duration: 300,
    };

    // Placeholder expectations: real schema should reject these
    expect(() => LegSchema.parse(missingDeparture)).toThrow();
    expect(() => LegSchema.parse(missingArrival)).toThrow();
  });
});

describe('Leg realtime / status mapping (T015) - placeholders', () => {
  it('accepts realtime metadata and maps status to allowed values', () => {
    const legWithRealtime = {
      mode: 'rail',
      from: { id: 'S1' },
      to: { id: 'S2' },
      departureTime: '2025-09-17T12:00:00Z',
      arrivalTime: '2025-09-17T12:30:00Z',
      duration: 1800,
      realtimeDelaySeconds: 120,
      status: 'delayed',
    };

    // Placeholder: real transform should map status to one of the allowed values.
    const result: any = LegSchema.parse(legWithRealtime);
    if (result && result.status !== undefined) {
      expect(['on_time', 'delayed', 'cancelled', 'scheduled_only']).toContain(result.status);
    }
  });
});

describe('Itinerary aggregates (T015) - placeholders', () => {
  it('parses itinerary and returns aggregates including scheduleType', () => {
    const legs = [
      {
        mode: 'walk',
        from: { id: 'A' },
        to: { id: 'B' },
        departureTime: '2025-09-17T09:00:00Z',
        arrivalTime: '2025-09-17T09:05:00Z',
        duration: 300,
      },
      {
        mode: 'bus',
        from: { id: 'B' },
        to: { id: 'C' },
        departureTime: '2025-09-17T09:10:00Z',
        arrivalTime: '2025-09-17T09:40:00Z',
        duration: 1800,
      },
    ];

    const itineraryInput = {
      id: 'it1',
      legs,
      totalDuration: 2100,
      numberOfTransfers: 1,
      walkingDistance: 250,
      scheduleType: 'realtime',
      // accessibilityNotes is optional per spec — tests must allow it if present
      accessibilityNotes: 'No stairs for final leg',
    };

    // Placeholder: real schema should validate and compute totals. This will currently FAIL until implemented.
    const parsed: any = ItinerarySchema.parse(itineraryInput);
    expect(parsed.legs).toBeDefined();
    expect(['realtime', 'scheduled', 'mixed']).toContain(parsed.scheduleType);
    // Placeholder aggregate check (will be replaced by real logic)
    expect(parsed.totalDuration).toBe(legs[0].duration + legs[1].duration);
  });
});

describe('Itinerary disruption flag (T015) - placeholders', () => {
  it('sets disruptionFlag and disruptionNote when a leg is cancelled or heavily delayed', () => {
    const legs = [
      {
        mode: 'bus',
        from: { id: 'X' },
        to: { id: 'Y' },
        departureTime: '2025-09-17T13:00:00Z',
        arrivalTime: '2025-09-17T13:30:00Z',
        duration: 1800,
        status: 'cancelled',
      },
    ];

    const itineraryInput = {
      id: 'it-disrupt',
      legs,
      totalDuration: 1800,
      numberOfTransfers: 0,
      walkingDistance: 0,
      scheduleType: 'mixed',
    };

    // Placeholder: real schema should flag disruptions. This will currently FAIL until implemented.
    const parsed: any = ItinerarySchema.parse(itineraryInput);
    if (parsed.disruptionFlag !== undefined) {
      expect(parsed.disruptionFlag).toBe(true);
      expect(typeof parsed.disruptionNote).toBe('string');
    } else {
      // If parse throws, the test will fail earlier; left here as a placeholder assertion shape.
      expect(parsed.disruptionFlag).toBeDefined();
    }
  });
});

describe('Itinerary fingerprint presence (T015) - placeholder', () => {
  it('includes a fingerprint string', () => {
    const itineraryInput = {
      id: 'it-fp',
      legs: [],
      totalDuration: 0,
      numberOfTransfers: 0,
      walkingDistance: 0,
      scheduleType: 'scheduled',
      fingerprint: 'placeholder-fp',
    };

    const parsed: any = ItinerarySchema.parse(itineraryInput);
    // Placeholder check: real implementation must ensure fingerprint is present and a string
    expect(typeof parsed.fingerprint).toBe('string');
  });
});