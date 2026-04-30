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
  // Inject the type filter as a SQL fragment so we never pass a NULL array
  // parameter — porsager can't infer the type of a bare NULL for text[].
  const typeFilter =
    types && types.length > 0
      ? sql`AND crime_type = ANY(${sql.array(types)})`
      : sql``;

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
      AND occurred_at >= ${since.toISOString()}
    ORDER BY occurred_at DESC
    LIMIT ${limit}
  `;
}
