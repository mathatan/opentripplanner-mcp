/**
 * Phase 1 placeholder: shared TypeScript type re-exports
 * These minimal types exist only to allow compilation of tests and early references.
 * They will be replaced by Zod schemas and full definitions in Phase 3.
 */

/** Geographic coordinate (WGS84) */
export type Coordinate = {
  lat: number;
  lon: number;
};

/** Lightweight reference to a location (origin/destination/stop) */
export type LocationRef = {
  id: string;
  name?: string;
  coord?: Coordinate;
};

/** Accessibility preferences (minimal placeholder) */
export type AccessibilityPrefs = {
  stepFree?: boolean;
  wheelchair?: boolean;
};

/** Plan constraints (minimal placeholder) */
export type PlanConstraints = {
  maxWalkingDistance?: number;
  maxTransfers?: number;
  accessibility?: AccessibilityPrefs;
  // unknown keys should be rejected by future strict schemas; placeholder allows any additional keys for now
  [key: string]: unknown;
};

/** Single leg of an itinerary (minimal) */
export type Leg = {
  mode: string;
  from: LocationRef;
  to: LocationRef;
  departureTime?: string; // ISO timestamp
  arrivalTime?: string; // ISO timestamp
  durationSeconds?: number;
  realtimeDelaySeconds?: number | null;
  cancelled?: boolean;
};

/** Itinerary composed of legs */
export type Itinerary = {
  id?: string;
  legs: Leg[];
  totalDurationSeconds?: number;
  transfers?: number;
  walkingDistanceMeters?: number;
  realtimeUsed?: boolean;
};

/** Geocode result item (minimal) */
export type GeocodeResult = {
  id?: string;
  name: string;
  coord: Coordinate;
  type?: "address" | "poi" | "stop" | string;
  confidence?: number; // 0..1
  language?: string;
  boundingBox?: [number, number, number, number] | null;
};

/** Geocode response wrapper (supporting truncation flag) */
export type GeocodeResponse = {
  results: GeocodeResult[];
  truncated?: boolean;
};

/** Departure item (minimal) */
export type Departure = {
  stopId?: string;
  line?: string;
  destination?: string;
  scheduledTime?: string; // ISO
  realtimeTime?: string | null; // ISO or null
  delaySeconds?: number | null;
  status?: "on_time" | "delayed" | "cancelled" | "scheduled_only" | string;
  platform?: string | null;
};

/** Departure response wrapper */
export type DepartureResponse = {
  departures: Departure[];
};

/** User variable stored by user (minimal) */
export type UserVariable = {
  key: string;
  type?: string;
  value: unknown;
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  ttlSeconds?: number | null;
};

/** Response for listing user variables */
export type UserVariablesResponse = {
  variables: UserVariable[];
};

/** Unified error object placeholder */
export type ErrorObject = {
  code: string; // kebab-case code per constitution
  message: string;
  hint?: string;
  correlationId?: string;
  retryAfter?: number | null;
};

/** Warning object placeholder */
export type WarningObject = {
  code: string;
  message: string;
};

export {};