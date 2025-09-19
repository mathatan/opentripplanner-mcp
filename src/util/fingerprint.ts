import type { Itinerary, Leg } from '../schema/itinerary.js';
import { createHash } from 'crypto';

/**
 * Produce a stable, deterministic fingerprint string based on an itinerary's legs
 * and a 2-minute start time bucket.
 *
 * Algorithm summary:
 * - For each leg build: `${mode}|${(line ?? '')}|${from?.id ?? from?.name ?? ''}|${to?.id ?? to?.name ?? ''}`
 *   (this intentionally excludes realtime/volatile fields - see "Excluded" below)
 * - Join leg strings with `~`
 * - Find the earliest departure time among legs (accepts `departureTime` or `departure`)
 * - Truncate to a 2-minute bucket in UTC and format as `YYYY-MM-DDTHH:MMZ` (floor)
 * - Combine `legsStr + '|' + startTimeBucket`
 * - Hash with Node crypto `sha1` -> `sha1:<hex>`
 * - If hashing fails, fallback to a deterministic 32-bit char-code based hash -> `fp:<number>`
 *
 * Included fields (used in the fingerprint):
 * - leg.mode
 * - leg.line (if present)
 * - leg.from: id OR name (prefers id)
 * - leg.to: id OR name (prefers id)
 * - earliest leg departure time (bucketed to 2-minute resolution)
 *
 * Excluded / volatile fields (intentionally NOT used):
 * - `delay`, `realtimeDelaySeconds`, `realtimeDelay`
 * - `cancelled`
 * - `disruptionNote`
 * - `realtimeUpdateTs`
 * - Any provider-specific ephemeral or realtime-only metadata
 *
 * Rationale:
 * - Realtime fields fluctuate frequently and would cause unnecessary fingerprint churn
 *   (false deduplication/regression). The fingerprint aims to be stable across minor
 *   realtime updates while changing when structural itinerary data (mode/line/from/to/start)
 *   meaningfully changes.
 *
 * Complexity:
 * - O(n) over number of legs to build leg strings and find the earliest departure.
 * - Deterministic `sha1` is used when available; falls back to a deterministic
 *   32-bit character-code hash if crypto hashing fails.
 */
export function fingerprintItinerary(itinerary: Itinerary | any): string {
  const legs: any[] = Array.isArray(itinerary?.legs) ? itinerary.legs : [];

  const legStrings = legs.map((leg: any) => {
    const mode = leg?.mode ?? '';
    const line = leg?.line ?? '';
    const from = leg?.from ?? leg?.origin ?? undefined;
    const to = leg?.to ?? leg?.destination ?? undefined;
    const fromStr = from?.id ?? from?.name ?? '';
    const toStr = to?.id ?? to?.name ?? '';
    // Note: intentionally exclude realtime/volatile fields (e.g. delay, realtimeDelay, cancelled, etc.)
    // from the leg string to avoid fingerprint churn caused by transient realtime updates.
    return `${mode}|${line ?? ''}|${fromStr}|${toStr}`;
  });

  const legsStr = legStrings.join('~');

  // find earliest departure among legs (accept multiple field names)
  let earliest: Date | null = null;
  for (const leg of legs) {
    const dt = leg?.departureTime ?? leg?.departure ?? null;
    if (!dt) continue;
    const d = new Date(dt);
    if (isNaN(d.getTime())) continue;
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

  // Hash with Node's crypto; fallback to simple deterministic 32-bit hash if something goes wrong
  try {
    const hex = createHash('sha1').update(combined, 'utf8').digest('hex');
    return `sha1:${hex}`;
  } catch (e) {
    // deterministic 32-bit integer hash from char codes
    let h = 0;
    for (let i = 0; i < combined.length; i++) {
      h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
    }
    const num = h >>> 0;
    return `fp:${num}`;
  }
}

export default fingerprintItinerary;