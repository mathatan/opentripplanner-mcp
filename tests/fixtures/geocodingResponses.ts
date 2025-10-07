/**
 * Test builders for deterministic, reusable GeoJSON features used in lookupService tests.
 *
 * These builders are intentionally simple, pure, and deterministic to keep tests
 * stable across runs. They provide convenience variants for common shapes:
 * - featureWithGeometry: feature with a valid geometry.coordinates point
 * - featureWithCenter: feature with an empty geometry and a Pelias-style center[]
 * - featureNoCoordinate: feature without geometry or center (to simulate missing coords)
 *
 * Additional helpers:
 * - makeConfidenceSet(values) -> produces features spread slightly in lon to guarantee stable ordering
 * - makeNameTieSet(names, confidence) -> produces features with identical confidence but distinct names
 * - featureCollection(features) -> returns a GeoJSON FeatureCollection
 * - searchResponse(features) -> returns an upstream-shaped response body { features: [...] }
 *
 * Important: geometry takes precedence if present and non-empty; center is used
 * only when geometry.coordinates is missing or empty. Builders avoid mutating inputs.
 */

/* Lightweight type aliases to avoid coupling with production types. */
export type GeoJSONFeature = { type: 'Feature'; geometry?: any; center?: [number, number]; properties?: Record<string, any>; [k: string]: any };
export type HttpResponseLike = { status: number; body: { features: GeoJSONFeature[] }; headers?: Record<string, string | number> };

/**
 * Options accepted by buildFeature.
 * - id: stable identifier used to form gid when not provided
 * - lon/lat: numeric coordinates used for geometry or center convenience builders
 * - confidence, score, layer, name, label, locality, name_en, name_sv: shallow mapped into properties
 * - propertiesOverride: full properties map that overrides composed properties
 *
 * Note: gid is constructed as `${layer}:${id}` if not explicitly supplied in propertiesOverride.
 */
export type BuildOpts = {
  id?: string | number;
  lon?: number;
  lat?: number;
  confidence?: number;
  score?: number;
  layer?: string;
  name?: string;
  label?: string;
  locality?: string;
  name_en?: string;
  name_sv?: string;
  propertiesOverride?: Record<string, any>;
  geometry?: any;
  center?: [number, number];
  // Internal flags (not usually provided by tests) to simulate empty geometry
  _emptyGeometry?: boolean;
};

/**
 * buildFeature(opts)
 *
 * Create a GeoJSON Feature with sensible stable defaults used across tests.
 * - default layer: 'address'
 * - default source: 'openstreetmap'
 * - gid: `${layer}:${id}` when id provided; otherwise omitted
 *
 * The function is pure and deterministic. It will not add geometry unless
 * coordinates are provided via lon/lat or explicit geometry passed through propertiesOverride.
 *
 * Pitfalls:
 * - If both geometry and center are supplied in propertiesOverride, geometry is preserved.
 * - Tests should prefer featureWithGeometry / featureWithCenter / featureNoCoordinate for clarity.
 */
export function buildFeature(opts: BuildOpts = {}): GeoJSONFeature {
  const {
    id,
    lon,
    lat,
    confidence,
    score,
    layer = 'address',
    name,
    label,
    locality,
    name_en,
    name_sv,
    propertiesOverride,
    geometry,
    center,
    _emptyGeometry,
  } = opts as any;

  // Support legacy `properties` key as alias for propertiesOverride for backwards compatibility.
  const legacyProps = (opts as any).properties;
  const props: Record<string, any> = { ...(propertiesOverride ?? (legacyProps ?? {})) };

  if (confidence !== undefined && props.confidence === undefined) props.confidence = confidence;
  if (score !== undefined && props.score === undefined) props.score = score;
  if (name !== undefined && props.name === undefined) props.name = name;
  if (label !== undefined && props.label === undefined) props.label = label;
  if (locality !== undefined && props.locality === undefined) props.locality = locality;
  if (name_en !== undefined && props.name_en === undefined) props.name_en = name_en;
  if (name_sv !== undefined && props.name_sv === undefined) props.name_sv = name_sv;

  const gid = id !== undefined ? `${layer}:${id}` : undefined;

  const base: GeoJSONFeature = {
    type: 'Feature',
    properties: { ...(props ?? {}) },
  };

  if (gid) {
    base.properties!._meta_gid = gid; // internal metadata; tests should not rely on exact format except that it's stable
    base.properties!.layer = layer;
    base.properties!.source = base.properties!.source ?? 'openstreetmap';
  }

  // Preserve explicit geometry if provided via propertiesOverride or opts.geometry.
  if (propertiesOverride && propertiesOverride.geometry !== undefined) {
    base.geometry = propertiesOverride.geometry;
  } else if (geometry !== undefined) {
    base.geometry = geometry;
  } else if (typeof lon === 'number' && typeof lat === 'number' && !_emptyGeometry) {
    // Attach geometry when lon/lat provided and not explicitly suppressed.
    base.geometry = { type: 'Point', coordinates: [lon, lat] };
  } else if (_emptyGeometry) {
    // Explicitly empty geometry simulation
    base.geometry = { type: 'Point', coordinates: [] };
  }

  // Preserve explicit center if provided via propertiesOverride or opts.center.
  if (propertiesOverride && propertiesOverride.center !== undefined) {
    base.center = propertiesOverride.center;
  } else if (center !== undefined) {
    base.center = center;
  } else if (typeof lon === 'number' && typeof lat === 'number' && _emptyGeometry) {
    // If empty geometry but lon/lat supplied, mirror in center for convenience.
    base.center = [lon, lat];
  }

  return base;
}

/**
 * featureWithGeometry(params)
 *
 * Convenience wrapper that produces a feature with explicit geometry.coordinates [lon, lat].
 * Accepts the same options as buildFeature; if lon/lat missing an error is thrown.
 *
 * JSDoc: Use this when tests expect geometry.coordinates to be present and valid.
 */
export function featureWithGeometry(params: BuildOpts & { id?: string | number }): GeoJSONFeature {
  if (typeof params.lon !== 'number' || typeof params.lat !== 'number') {
    throw new Error('featureWithGeometry requires numeric lon and lat');
  }
  return buildFeature({ ...params, _emptyGeometry: false });
}

/**
 * featureWithCenter(params)
 *
 * Convenience wrapper that produces a feature where geometry.coordinates is intentionally
 * empty (to simulate missing primary geometry) and a Pelias-style `center: [lon, lat]` is provided.
 *
 * JSDoc: geometry.coordinates will be set to [] and center will be populated. Code under test
 * should prefer geometry when present and non-empty; center is a fallback. Use this builder to
 * exercise the center-fallback extraction path.
 */
export function featureWithCenter(params: BuildOpts & { id?: string | number }): GeoJSONFeature {
  if (typeof params.lon !== 'number' || typeof params.lat !== 'number') {
    throw new Error('featureWithCenter requires numeric lon and lat');
  }
  const f = buildFeature({ ...params, _emptyGeometry: true });
  // ensure an explicit empty geometry to simulate missing coordinates
  f.geometry = { type: 'Point', coordinates: [] };
  f.center = [params.lon!, params.lat!];
  return f;
}

/**
 * featureNoCoordinate(params)
 *
 * Produce a feature that contains neither geometry nor center. Useful for testing
 * exclusion paths where a candidate lacks coordinates entirely.
 *
 * JSDoc: Use this to simulate upstream results missing any coordinate data.
 */
export function featureNoCoordinate(params: BuildOpts = {}): GeoJSONFeature {
  // Build without geometry and without center
  const f = buildFeature({ ...params, _emptyGeometry: true });
  delete f.geometry;
  delete f.center;
  return f;
}

/**
 * makeConfidenceSet(values)
 *
 * Create an array of features from the provided confidence values. To guarantee deterministic
 * ordering despite identical coordinates, features are spread by a tiny lon offset (index * 1e-5).
 *
 * JSDoc: Useful for exercising confidence-based ordering and truncation deterministically.
 */
export function makeConfidenceSet(values: number[], baseLon = 24.94, baseLat = 60.17): GeoJSONFeature[] {
  return values.map((v, i) =>
    featureWithGeometry({
      id: `c${i}`,
      lon: baseLon + i * 0.00001,
      lat: baseLat,
      confidence: v,
      name: `Conf${i}`,
      label: `Conf${i}, Region`,
    }),
  );
}

/**
 * makeNameTieSet(names, confidence)
 *
 * Produce features that all share the same confidence value but have distinct names. They are
 * placed at identical coordinates to force comparator fallback to name ordering.
 *
 * JSDoc: Use when you need deterministic lexical tie-breaking among equal-confidence results.
 */
export function makeNameTieSet(names: string[], confidence: number, lon = 24.94, lat = 60.17): GeoJSONFeature[] {
  return names.map((n, i) =>
    featureWithGeometry({
      id: `n${i}`,
      lon,
      lat,
      confidence,
      name: n,
      label: `${n}, Region`,
    }),
  );
}

/**
 * featureCollection(features)
 *
 * Return a GeoJSON FeatureCollection wrapping the provided features.
 */
export function featureCollection(features: GeoJSONFeature[]) {
  return { type: 'FeatureCollection', features };
}

/**
 * searchResponse(features)
 *
 * Return an upstream-shaped search response body ({ features: [...] }) used by makeHttpResponse.
 */
export function searchResponse(features: GeoJSONFeature[]) {
  return { features };
}

/**
 * makeHttpResponse(opts)
 *
 * Construct a minimal HTTP-like response object compatible with test http mock helpers.
 * Kept here for backward compatibility with existing tests.
 */
export function makeHttpResponse(opts: { status?: number; features?: GeoJSONFeature[]; headers?: Record<string, string | number> } = {}): HttpResponseLike {
  const status = opts.status ?? 200;
  const features = opts.features ?? [];
  const headers = opts.headers;
  return { status, body: { features }, headers };
}