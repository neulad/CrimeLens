import { queryClient as sql } from '../../db/client';

export interface IncidentRow {
  id: string;
  crimeType: string;
  occurredAt: Date;
  city: string;
  description: string;
  source: string;
  lat: number;
  lng: number;
}

export interface BboxParams {
  west: number;
  south: number;
  east: number;
  north: number;
  types?: string[];
  since: Date;
  limit: number;
}

export async function getIncidentById(id: string): Promise<IncidentRow | null> {
  const rows = await sql<IncidentRow[]>`
    SELECT
      id,
      crime_type   AS "crimeType",
      occurred_at  AS "occurredAt",
      city,
      description,
      source,
      ST_Y(location) AS lat,
      ST_X(location) AS lng
    FROM incidents
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface CreateIncidentParams {
  lat: number;
  lng: number;
  crimeType: string;
  city: string;
  occurredAt: string; // ISO datetime string from client
  description: string;
  userId: string;
}

const VALID_CRIME_TYPES = new Set(['pickpocketing', 'bag_snatching', 'theft_from_vehicle', 'other']);

export async function createIncident(params: CreateIncidentParams): Promise<string> {
  const { newId } = await import('../../lib/ids');
  if (!VALID_CRIME_TYPES.has(params.crimeType)) throw new Error('Invalid crime type');
  const id = newId();
  await sql`
    INSERT INTO incidents (id, crime_type, occurred_at, location, city, description, source, created_by)
    VALUES (
      ${id}::uuid,
      ${params.crimeType},
      ${params.occurredAt}::timestamptz,
      ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326),
      ${params.city},
      ${params.description.trim()},
      'USER_REPORTED',
      ${params.userId}::uuid
    )
  `;
  return id;
}

export async function getBboxIncidents(params: BboxParams): Promise<IncidentRow[]> {
  const { west, south, east, north, types, since, limit } = params;
  // Inject the type filter as a SQL fragment so we never pass a NULL array
  // parameter — porsager can't infer the type of a bare NULL for text[].
  const typeFilter =
    types && types.length > 0 ? sql`AND crime_type = ANY(${sql.array(types)})` : sql``;

  return sql<IncidentRow[]>`
    SELECT
      id,
      crime_type   AS "crimeType",
      occurred_at  AS "occurredAt",
      city,
      description,
      source,
      ST_Y(location) AS lat,
      ST_X(location) AS lng
    FROM incidents
    WHERE ST_Intersects(
        location,
        ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
      )
      ${typeFilter}
      AND occurred_at >= ${since.toISOString()}::timestamptz
    ORDER BY occurred_at DESC
    LIMIT ${limit}
  `;
}
