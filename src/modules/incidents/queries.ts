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

export async function getBboxIncidents(params: BboxParams): Promise<IncidentRow[]> {
  const { west, south, east, north, types, since, limit } = params;
  // null → SQL NULL (no type filter); sql.array → typed text[] param
  const typesParam = types && types.length > 0 ? sql.array(types, 'text') : null;

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
      AND (${typesParam} IS NULL OR crime_type = ANY(${typesParam}))
      AND occurred_at >= ${since}
    ORDER BY occurred_at DESC
    LIMIT ${limit}
  `;
}
