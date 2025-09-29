# Phase 1: Data Model (MCP Timetables, Routes & Address Lookup)

Spec: `specs/001-build-an-mcp/spec.md`
Research: `specs/001-build-an-mcp/research.md`

## Overview

Defines core entities, relationships, validation rules. Implementation will use Zod v3. Interfaces below are authoritative for contracts (tools) and internal layering.

## Entities

### LocationQueryInput

Represents inbound free‑text location lookup request.
Fields:

- rawText: string (1..200 chars; trimmed)
- focusPoint?: { lat: number; lon: number }
- maxDistanceMeters?: number (>0) – MUST accompany focusPoint else VALIDATION error
- languagePreference?: 'fi' | 'en' | 'sv' (optional hint, fallback chain still applied)

Validation Rules:

- lat ∈ [-90,90], lon ∈ [-180,180]
- maxDistanceMeters integer 1..200000 (pragmatic cap)

### ResolvedLocation

- id?: string (present for STOP; absent for ADDRESS)
- name: string
- primaryLanguage: 'fi' | 'en' | 'sv' | 'default'
- names?: { fi?: string; en?: string; sv?: string }
- type: 'ADDRESS' | 'STOP'
- coordinate: { lat: number; lon: number }
- confidenceScore: number (0..1)
- locality?: string
- rawQuery: string (echo of original input, not user provided for chain-of-thought; safe)

### DisambiguationSet

- candidates: ResolvedLocation[] (1..maxLookupCandidates)
- totalCandidatesFound: number
- truncated: boolean
- needsClarification: true (invariant for this entity type)
- autoResolvedThreshold: number (echo constant 0.80)

### RouteRequestInput

- origin: LocationQueryInput | ResolvedLocation
- destination: LocationQueryInput | ResolvedLocation
- departureTime?: string (ISO 8601) XOR arrivalTime?: string (ISO 8601) (exactly one)
- searchWindowMinutes?: number (default 45, clamp 120)
- journeyPreset?: 'FASTEST' | 'FEWEST_TRANSFERS' | 'LEAST_WALK'

Validation:

- origin and destination must not resolve to identical coordinates/id
- Exactly one temporal selector present

### Itinerary

- id: string (deterministic hash of legs + times)
- durationMinutes: number
- startTime: string (ISO 8601)
- endTime: string (ISO 8601)
- numberOfTransfers: number
- totalWalkDistanceMeters: number
- legs: Leg[]

### Leg

- mode: string (enum subset WALK, BUS, TRAM, RAIL, SUBWAY, FERRY, COACH, UNKNOWN)
- lineName?: string
- from: { name: string; lat: number; lon: number }
- to: { name: string; lat: number; lon: number }
- departureTime: string (ISO 8601)
- arrivalTime: string (ISO 8601)
- headsign?: string
- distanceMeters: number

### TimetableRequestInput

- stopId: string (pattern: ^[A-Z0-9:_-]+$)
- maxDepartures?: number (default 3, clamp 5)
- horizonMinutes?: number (default 45, clamp 90)

### Departure

- scheduledTime: string (ISO 8601)
- routeShortName: string
- routeLongName?: string
- headsign?: string
- mode: string
- serviceDay: string (ISO 8601 date)

### ErrorPayload

- category: 'VALIDATION' | 'NOT_FOUND' | 'DISAMBIGUATION_REQUIRED' | 'NO_RESULTS' | 'THROTTLED' | 'UPSTREAM_FAILURE' | 'AUTH_FAILURE' | 'INTERNAL'
- code: string
- message: string
- details?: Record<string, unknown>
- recommendation?: string

## Relationships

- LocationQueryInput -> (ResolvedLocation | DisambiguationSet)
- RouteRequestInput -> Itinerary[]
- TimetableRequestInput -> Departure[]

## Zod Schema Sketches (Non-executable excerpt)

```ts
import { z } from 'zod';

export const CoordinateSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lon: z.number().gte(-180).lte(180)
});

export const LocationQueryInputSchema = z.object({
  rawText: z.string().min(1).max(200).transform(s => s.trim()),
  focusPoint: CoordinateSchema.optional(),
  maxDistanceMeters: z.number().int().positive().max(200000).optional(),
  languagePreference: z.enum(['fi','en','sv']).optional()
}).refine(v => !v.maxDistanceMeters || v.focusPoint, { message: 'maxDistanceMeters requires focusPoint', path: ['maxDistanceMeters'] });

export const ResolvedLocationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  primaryLanguage: z.enum(['fi','en','sv','default']),
  names: z.object({ fi: z.string().optional(), en: z.string().optional(), sv: z.string().optional() }).partial().optional(),
  type: z.enum(['ADDRESS','STOP']),
  coordinate: CoordinateSchema,
  confidenceScore: z.number().gte(0).lte(1),
  locality: z.string().optional(),
  rawQuery: z.string()
});

export const DisambiguationSetSchema = z.object({
  candidates: ResolvedLocationSchema.array().min(1).max(5),
  totalCandidatesFound: z.number().int().gte(1),
  truncated: z.boolean(),
  needsClarification: z.literal(true),
  autoResolvedThreshold: z.number().gte(0).lte(1)
});

export const RouteRequestInputSchema = z.object({
  origin: z.union([LocationQueryInputSchema, ResolvedLocationSchema]),
  destination: z.union([LocationQueryInputSchema, ResolvedLocationSchema]),
  departureTime: z.string().datetime().optional(),
  arrivalTime: z.string().datetime().optional(),
  searchWindowMinutes: z.number().int().positive().max(120).default(45),
  journeyPreset: z.enum(['FASTEST','FEWEST_TRANSFERS','LEAST_WALK']).default('FASTEST')
}).refine(v => (v.departureTime ? !v.arrivalTime : !!v.arrivalTime), { message: 'Specify exactly one of departureTime or arrivalTime', path: ['departureTime','arrivalTime'] });

export const LegSchema = z.object({
  mode: z.string(),
  lineName: z.string().optional(),
  from: CoordinateSchema.merge(z.object({ name: z.string() })),
  to: CoordinateSchema.merge(z.object({ name: z.string() })),
  departureTime: z.string().datetime(),
  arrivalTime: z.string().datetime(),
  headsign: z.string().optional(),
  distanceMeters: z.number().int().nonnegative()
});

export const ItinerarySchema = z.object({
  id: z.string(),
  durationMinutes: z.number().int().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  numberOfTransfers: z.number().int().nonnegative(),
  totalWalkDistanceMeters: z.number().int().nonnegative(),
  legs: LegSchema.array().min(1)
});

export const TimetableRequestInputSchema = z.object({
  stopId: z.string().regex(/^[A-Z0-9:_-]+$/),
  maxDepartures: z.number().int().positive().max(5).default(3),
  horizonMinutes: z.number().int().positive().max(90).default(45)
});

export const DepartureSchema = z.object({
  scheduledTime: z.string().datetime(),
  routeShortName: z.string(),
  routeLongName: z.string().optional(),
  headsign: z.string().optional(),
  mode: z.string(),
  serviceDay: z.string() // enforce date-only format separately if needed
});

export const ErrorPayloadSchema = z.object({
  category: z.enum(['VALIDATION','NOT_FOUND','DISAMBIGUATION_REQUIRED','NO_RESULTS','THROTTLED','UPSTREAM_FAILURE','AUTH_FAILURE','INTERNAL']),
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  recommendation: z.string().optional()
});
```

## Notes

- Some schemas (RouteRequestInput) rely on `.datetime()` which expects RFC 3339; if broader ISO 8601 needed, adjust with regex.
- Stable hashing for itinerary `id` may use a canonical JSON of legs + times hashed via SHA-256 (implementation detail not in contract).
- Future additions: micro-cache metadata wrapper schema (Deferred).
