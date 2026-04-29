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

  if (types && types.length > 0) {
    return sql<IncidentRow[]>`
      SELECT
        id,
        crime_type   AS "crimeType",
        occurred_at  AS "occurredAt",
        city,
        description,
        source,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM incidents
      WHERE ST_Intersects(
          location,
          ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
        )
        AND crime_type = ANY(${sql.array(types, 'text')})
        AND occurred_at >= ${since}
      ORDER BY occurred_at DESC
      LIMIT ${limit}
    `;
  }

  return sql<IncidentRow[]>`
    SELECT
      id,
      crime_type   AS "crimeType",
      occurred_at  AS "occurredAt",
      city,
      description,
      source,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng
    FROM incidents
    WHERE ST_Intersects(
        location,
        ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326)
      )
      AND occurred_at >= ${since}
    ORDER BY occurred_at DESC
    LIMIT ${limit}
  `;
}
