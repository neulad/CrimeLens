import { type BboxParams, type IncidentRow, getBboxIncidents } from './queries';

export interface ListByBboxParams {
  west: number;
  south: number;
  east: number;
  north: number;
  /** Comma-separated crime types, or undefined for all */
  types?: string;
  /** ISO date, or "30d" | "90d" | "1y" | "all" */
  since?: string;
  limit?: number;
}

const VALID_CRIME_TYPES = new Set([
  'pickpocketing',
  'bag_snatching',
  'theft_from_vehicle',
  'other',
]);

function parseSince(since?: string): Date {
  if (!since || since === 'all') return new Date(0);
  if (since === '30d') return daysAgo(30);
  if (since === '90d') return daysAgo(90);
  if (since === '1y') return daysAgo(365);
  const d = new Date(since);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function listByBbox(params: ListByBboxParams): Promise<IncidentRow[]> {
  const types = params.types
    ? params.types.split(',').filter((t) => VALID_CRIME_TYPES.has(t))
    : undefined;

  const query: BboxParams = {
    west: params.west,
    south: params.south,
    east: params.east,
    north: params.north,
    types: types && types.length > 0 ? types : undefined,
    since: parseSince(params.since),
    limit: Math.min(params.limit ?? 500, 1000),
  };

  return getBboxIncidents(query);
}
