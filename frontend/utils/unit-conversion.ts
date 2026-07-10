/**
 * Unit conversion + smart scaling, built on the canonical units' `to_base`
 * factors (see services/unit-service.ts). Same-type conversions only — we don't
 * do weight↔volume (that needs per-ingredient density, a future addition).
 */
import { Unit } from '@/services/unit-service';

/** True if `qty` in `from` can be exactly converted to `to`. */
export function canConvert(from?: Unit | null, to?: Unit | null): boolean {
  return (
    !!from && !!to &&
    from.type === to.type &&
    from.to_base != null &&
    to.to_base != null &&
    to.to_base !== 0
  );
}

/** Convert a quantity between two units of the same type, or null if it can't. */
export function convertQuantity(qty: number, from?: Unit | null, to?: Unit | null): number | null {
  if (!canConvert(from, to)) return null;
  return (qty * from!.to_base!) / to!.to_base!;
}

/**
 * Pick the friendliest unit to show a scaled quantity in. Rolls up to the
 * largest unit of the same type in which the value stays ≥ 1 (so 2 tbsp becomes
 * 1 fl oz / 0.125 cup territory, 16 tbsp becomes 1 cup), preferring units in the
 * source unit's measurement system, then universal ones. Units without a
 * `to_base` (e.g. "clove") are returned unchanged.
 *
 * `only` optionally restricts the candidate units by id — pass a curated
 * cooking set (cup/tbsp/tsp/…) if you want to avoid landing on fluid ounces.
 */
export function normalizeMeasure(
  qty: number,
  unit: Unit,
  units: Unit[],
  only?: string[],
): { quantity: number; unit: Unit } {
  if (unit.to_base == null || qty <= 0) return { quantity: qty, unit };

  let candidates = units.filter(
    (u) => u.type === unit.type && u.to_base != null && (!only || only.includes(u.id)),
  );
  if (candidates.length === 0) candidates = [unit];

  const preferred = candidates.filter((u) => u.system === unit.system || u.system === 'universal');
  const pool = (preferred.length ? preferred : candidates).sort((a, b) => a.to_base! - b.to_base!);

  const base = qty * unit.to_base;
  let best = pool[0];
  for (const u of pool) {
    if (base / u.to_base! >= 1) best = u;
    else break;
  }
  return { quantity: base / best.to_base!, unit: best };
}
