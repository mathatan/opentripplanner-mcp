/**
 * T039: Aggregate exports (schema barrel)
 *
 * Constitution reference: C14 — prefer explicit named re-exports and type-only exports
 * to avoid importing runtime values and to reduce circular dependency risk.
 *
 * Pure re-exports only — no runtime code or side-effects in this file.
 */

export { CoordinateSchema, type Coordinate } from "./coordinate.js";
export { LocationRefSchema, type LocationRef, assertNever } from "./locationRef.js";
export {
  AccessibilityPrefsSchema,
  type AccessibilityPrefs,
  PlanConstraintsSchema,
  type PlanConstraints,
} from "./planConstraints.js";
export {
  LegSchema,
  type Leg,
  ItinerarySchema,
  type Itinerary,
  JourneyPlanResponseSchema,
  type JourneyPlanResponse,
} from "./itinerary.js";
export {
  GeocodeResultSchema,
  type GeocodeResult,
  GeocodeResponseSchema,
  type GeocodeResponse,
} from "./geocode.js";
export {
  DepartureSchema,
  type Departure,
  DepartureResponseSchema,
  type DepartureResponse,
} from "./departure.js";
export {
  UserVariableSchema,
  type UserVariable,
  UserVariablesResponseSchema,
  type UserVariablesResponse,
} from "./userVariable.js";
export { ErrorSchema, type Error, WarningSchema, type Warning } from "./error.js";