/**
 * Unit conversion + smart scaling, built on the canonical units' `to_base`
 * factors (see services/unit-service.ts). Same-type conversions only — we don't
 * do weight↔volume (that needs per-ingredient density, a future addition).
 */
import { Unit } from '@/services/unit-service';

/**
 * Units we're willing to *display* a scaled quantity in — the familiar US
 * home-cooking set plus metric, deliberately excluding fluid ounces / pints /
 * quarts so scaling lands on cups/tbsp/tsp (per the "2 tbsp → not fl oz" ask).
 */
export const DISPLAY_UNIT_IDS = ['tsp', 'tbsp', 'cup', 'ml', 'l', 'g', 'kg', 'oz', 'lb'];

/** Resolve a stored unit string (id, abbreviation, name, or plural) to a
 *  canonical Unit, case-insensitively. Returns null for free-text units. */
export function findUnit(units: Unit[], raw: string | null | undefined): Unit | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  return (
    units.find(
      (u) =>
        u.id.toLowerCase() === s ||
        u.abbreviation.toLowerCase() === s ||
        u.name?.toLowerCase() === s ||
        u.plural?.toLowerCase() === s,
    ) ?? null
  );
}

/** How ingredient quantities should be displayed. Mirrors the House
 *  preference `preferred_units`. */
export type UnitSystemPref = 'metric' | 'imperial' | 'as_written';

/**
 * Scale a quantity by a multiplier and pick a friendly unit to show it in.
 *
 * With `pref` 'as_written' (default): conservative — only ever rolls *up* into
 * a larger unit (3 tsp → 1 tbsp, 16 tbsp → 1 cup), never down (¼ cup stays
 * ¼ cup). With 'metric' or 'imperial': fully converts a convertible measure
 * into the nicest unit of that system (1 cup → 240 ml; 200 g → 7 oz). Falls
 * back to a plain multiply when the unit is free-text or non-convertible.
 */
export function scaleForDisplay(
  quantity: number,
  rawUnit: string | null | undefined,
  multiplier: number,
  units: Unit[],
  pref: UnitSystemPref = 'as_written',
): { quantity: number; unit: string } {
  const scaled = quantity * multiplier;
  const resolved = findUnit(units, rawUnit);
  if (!resolved || resolved.to_base == null) {
    return { quantity: scaled, unit: rawUnit ? String(rawUnit) : '' };
  }

  // Explicit system preference: convert into that system's display units,
  // rolling up OR down to the friendliest one (counts like "clove" have no
  // system and just pass through the non-convertible branch above).
  if ((pref === 'metric' || pref === 'imperial') && resolved.system !== 'universal') {
    const targetIds = DISPLAY_UNIT_IDS.filter((id) => {
      const u = units.find((x) => x.id === id);
      return u && u.type === resolved.type && (u.system === pref || u.system === 'universal');
    });
    if (targetIds.length) {
      const norm = normalizeMeasure(scaled, resolved, units, targetIds);
      return { quantity: norm.quantity, unit: norm.unit.abbreviation };
    }
  }

  const norm = normalizeMeasure(scaled, resolved, units, DISPLAY_UNIT_IDS);
  // Only accept the rolled-up unit if it's the same size or larger.
  if (norm.unit.to_base != null && resolved.to_base != null && norm.unit.to_base >= resolved.to_base) {
    return { quantity: norm.quantity, unit: norm.unit.abbreviation };
  }
  return { quantity: scaled, unit: resolved.abbreviation };
}

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
 * Cross-convert a quantity between weight and volume using a density in g/ml.
 * `from`/`to` must be one weight + one volume unit (either order). Returns the
 * converted quantity, or null if the units aren't a weight/volume pair or the
 * density is missing. Base units: volume→ml, weight→g.
 */
export function crossConvert(
  qty: number,
  from: Unit | null | undefined,
  to: Unit | null | undefined,
  densityGPerMl: number | null | undefined,
): number | null {
  if (!from || !to || !densityGPerMl || from.to_base == null || to.to_base == null) return null;
  const types = new Set([from.type, to.type]);
  if (!(types.has('weight') && types.has('volume'))) return null;

  const baseFrom = qty * from.to_base; // ml if volume, g if weight
  // Convert the source's base amount into the target type's base amount.
  const baseTo =
    from.type === 'volume'
      ? baseFrom * densityGPerMl // ml → g
      : baseFrom / densityGPerMl; // g → ml
  return baseTo / to.to_base;
}

/**
 * Given a scaled quantity + its (weight or volume) unit, return the equivalent
 * in the *other* measure type, rolled into a friendly cooking unit — e.g.
 * 200 g flour → "1 2/3 cup", 1 cup water → "237 g". Null when the unit isn't
 * convertible or no density is known.
 */
export function toggleMeasureType(
  quantity: number,
  unit: Unit,
  units: Unit[],
  densityGPerMl: number | null,
): { quantity: number; unit: string } | null {
  if (unit.to_base == null || (unit.type !== 'weight' && unit.type !== 'volume')) return null;
  const targetType = unit.type === 'weight' ? 'volume' : 'weight';
  // Pick the base unit of the target type to convert into, then normalize.
  const targetBase = units.find((u) => u.type === targetType && u.to_base === 1);
  if (!targetBase) return null;
  const converted = crossConvert(quantity, unit, targetBase, densityGPerMl);
  if (converted == null) return null;
  const norm = normalizeMeasure(converted, targetBase, units, DISPLAY_UNIT_IDS);
  return { quantity: norm.quantity, unit: norm.unit.abbreviation };
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
