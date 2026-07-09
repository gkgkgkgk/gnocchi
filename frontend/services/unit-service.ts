/**
 * Legacy shim. Units used to be a normalized lookup table; now they're
 * free-text strings stored inline on the ingredient. These stubs let old
 * screens keep compiling.
 */

export interface Unit {
  id: string;
  abbreviation: string;
  name?: string;
}

export async function fetchUnits(): Promise<Unit[]> {
  return [];
}

export async function fetchUnitById(): Promise<Unit | null> {
  return null;
}

export async function fetchUnitsByIds(): Promise<Unit[]> {
  return [];
}
