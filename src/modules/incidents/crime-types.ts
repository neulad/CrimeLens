/**
 * Single source of truth for incident crime types.
 * Must stay in sync with the `crime_type_check` constraint in the DB
 * (migration 0003) and the filter pills in the map layout.
 */
export const CRIME_TYPES = [
  'pickpocketing',
  'bicycle_stolen',
  'street_fight',
  'robbery',
  'street_scams',
] as const;

export type CrimeType = (typeof CRIME_TYPES)[number];

export const VALID_CRIME_TYPES: ReadonlySet<string> = new Set(CRIME_TYPES);
