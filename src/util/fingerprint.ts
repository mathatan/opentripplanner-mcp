import type { Itinerary } from '../schema/itinerary.js';
import { createHash } from 'crypto';

/**
 * Produce a stable, deterministic fingerprint string based on an itinerary's legs
 * and a 2-minute start time bucket.
 *
 * Enhancements:
 * - Escape/encode components to avoid delimiter collisions (use encodeURIComponent).
 * - Normalize numeric epoch seconds to milliseconds when values appear to be seconds.
 * - Treat timezone-less ISO strings as UTC (append 'Z') for deterministic bucketing.
 * - Use an explicit empty-itinerary marker (`<no-legs>`) instead of ambiguous ''.
 * - Fallback hashing uses Unicode codepoint-aware aggregation.
 */

const NO_LEGS_MARKER = '<no-legs>';
const ESC = (v: unknown) => encodeURIComponent(String(v ?? ''));

/** Try to interpret various departure value shapes into a Date (or null) */
function parseDateLike(raw: unknown): Date | null {
  if (raw == null) return null;

  // Numeric (number or numeric-string) normalization:
  if (typeof raw === 'number') {
    // Heuristic: if less than 1e12, likely seconds -> convert to ms
    const ms = raw < 1e12 ? raw * 1000 : raw;
    return new Date(ms);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();

    // Pure numeric string -> interpret as epoch (seconds or ms)
    if (/^\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      const ms = n < 1e12 ? n * 1000 : n;
      return new Date(ms);
    }

    // Timezone-less ISO (e.g. "2025-01-01T10:00:00" or with fractional seconds)
    // Append 'Z' to treat as UTC for deterministic bucketing if no timezone info present
    // Regex matches YYYY-MM-DDTHH:MM:SS(.sss)? with no trailing Z or offset
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
      return new Date(trimmed + 'Z');
    }

    // Fallback to Date parsing for other ISO forms (may include timezone offsets)
    return new Date(trimmed);
  }

  // Unknown shape
  return null;
}

export function fingerprintItinerary(itinerary: Itinerary | any): string {
  const legs: any[] = Array.isArray(itinerary?.legs) ? itinerary.legs : [];

  const legStrings = legs.map((leg: any) => {
    const mode = leg?.mode ?? '';
    const line = leg?.line ?? '';
    const from = leg?.from ?? leg?.origin ?? undefined;
    const to = leg?.to ?? leg?.destination ?? undefined;
    const fromStr = from?.id ?? from?.name ?? '';
    const toStr = to?.id ?? to?.name ?? '';

    // encode components to avoid delimiter collisions
    return `${ESC(mode)}|${ESC(line)}|${ESC(fromStr)}|${ESC(toStr)}`;
  });

  const legsStr = legStrings.length ? legStrings.join('~') : NO_LEGS_MARKER;

  // find earliest departure among legs (accept multiple field names)
  let earliest: Date | null = null;
  for (const leg of legs) {
    const raw = leg?.departureTime ?? leg?.departure ?? null;
    const d = parseDateLike(raw);
    if (!d || isNaN(d.getTime())) continue;
    if (earliest === null || d.getTime() < earliest.getTime()) earliest = d;
  }

  let startTimeBucket = '';
  if (earliest) {
    // truncate seconds and ms, then bucket minutes into 2-minute resolution (floor)
    const y = earliest.getUTCFullYear();
    const mo = earliest.getUTCMonth();
    const da = earliest.getUTCDate();
    const h = earliest.getUTCHours();
    const m = earliest.getUTCMinutes();
    const bucketMin = Math.floor(m / 2) * 2;
    const pad = (n: number) => String(n).padStart(2, '0');
    startTimeBucket = `${y}-${pad(mo + 1)}-${pad(da)}T${pad(h)}:${pad(bucketMin)}Z`;
  }

  const combined = `${legsStr}|${startTimeBucket}`;

  // Hash with Node's crypto; fallback to deterministic 32-bit hash using codepoints
  try {
    // Allow tests to force the fallback path by setting FINGERPRINT_FORCE_FALLBACK=1
    if (process.env.FINGERPRINT_FORCE_FALLBACK === '1') {
      throw new Error('forced-fallback');
    }
    const hex = createHash('sha1').update(combined, 'utf8').digest('hex');
    return `sha1:${hex}`;
  } catch (e) {
    // codepoint-aware deterministic 32-bit integer hash
    let h = 0;
    for (const ch of Array.from(combined)) {
      h = (Math.imul(31, h) + (ch.codePointAt(0) ?? 0)) | 0;
    }
    const num = h >>> 0;
    return `fp:${num}`;
  }
}

export default fingerprintItinerary;