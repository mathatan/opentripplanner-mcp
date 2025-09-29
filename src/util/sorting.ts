// Deterministic sorting helpers for candidates, itineraries, departures

// Minimal local types to avoid tight coupling with schema module and allow
// independent utility implementation.
export type ResolvedLocation = {
    confidenceScore: number;
    primaryLanguage: string;
    coordinate?: { lat: number; lon: number };
    name: string;
};

export type Itinerary = {
    durationMinutes: number;
    numberOfTransfers: number;
    startTime: string;
    id: string;
};

export type Departure = {
    scheduledTime: string;
    routeShortName?: string;
};

export function sortLocationsDeterministic(a: ResolvedLocation, b: ResolvedLocation) {
    // Primary: higher confidenceScore first
    if (a.confidenceScore !== b.confidenceScore) return b.confidenceScore - a.confidenceScore;
    // Secondary: by primaryLanguage preference (explicit order: fi, en, sv, default)
    const langOrder = { fi: 0, en: 1, sv: 2, default: 3 } as Record<string, number>;
    const la = langOrder[a.primaryLanguage] ?? 99;
    const lb = langOrder[b.primaryLanguage] ?? 99;
    if (la !== lb) return la - lb;
    // Tertiary: distance tie-breaker if both have coordinate and same score — use lexicographic lat/lon
    if (a.coordinate && b.coordinate) {
        if (a.coordinate.lat !== b.coordinate.lat) return a.coordinate.lat - b.coordinate.lat;
        if (a.coordinate.lon !== b.coordinate.lon) return a.coordinate.lon - b.coordinate.lon;
    }
    // Final: stable fallback by name
    return a.name.localeCompare(b.name);
}

export function sortItinerariesDeterministic(a: Itinerary, b: Itinerary) {
    // Primary: shorter duration
    if (a.durationMinutes !== b.durationMinutes) return a.durationMinutes - b.durationMinutes;
    // Secondary: fewer transfers
    if (a.numberOfTransfers !== b.numberOfTransfers) return a.numberOfTransfers - b.numberOfTransfers;
    // Tertiary: earlier startTime
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    // Fallback: lexical id
    return a.id.localeCompare(b.id);
}

export function sortDeparturesDeterministic(a: Departure, b: Departure) {
    // Ordered by scheduledTime then routeShortName
    const t = a.scheduledTime.localeCompare(b.scheduledTime);
    if (t !== 0) return t;
    return (a.routeShortName || "").localeCompare(b.routeShortName || "");
}
