/**
 * Canonical measurement units, backed by the /units endpoint. `to_base` is the
 * multiplier into the base unit of its `type` (volume→ml, weight→g, count→1),
 * which powers conversion/scaling in utils/unit-conversion.ts. Free-typed units
 * (from the picker) omit the conversion fields — that's fine, they just don't
 * convert.
 */
import { api } from '@/lib/api';

export interface Unit {
  id: string;
  name?: string;
  abbreviation: string;
  plural?: string | null;
  system?: string; // 'metric' | 'imperial' | 'universal'
  type?: string;   // 'volume' | 'weight' | 'count'
  to_base?: number | null;
  ord?: number;
}

let _cache: Unit[] | null = null;

export async function fetchUnits(): Promise<Unit[]> {
  if (_cache) return _cache;
  _cache = await api.get<Unit[]>('/units');
  return _cache;
}

/** Drop the cached list (e.g. if units ever become editable). */
export function invalidateUnitsCache() {
  _cache = null;
}

export async function fetchUnitById(id: string): Promise<Unit | null> {
  if (!id) return null;
  const units = await fetchUnits();
  return units.find((u) => u.id === id) ?? null;
}

export async function fetchUnitsByIds(ids: string[]): Promise<Unit[]> {
  const units = await fetchUnits();
  return ids
    .map((id) => units.find((u) => u.id === id))
    .filter((u): u is Unit => !!u);
}
