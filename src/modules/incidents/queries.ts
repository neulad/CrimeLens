// Geospatial queries — implemented in Week 6.
// getBboxIncidents({ west, south, east, north, types, since, limit }):
//   SELECT … FROM incidents
//   WHERE ST_Intersects(location, ST_MakeEnvelope($1,$2,$3,$4,4326))
//     AND crime_type = ANY($5)
//     AND occurred_at >= $6
//   ORDER BY occurred_at DESC
//   LIMIT $7;
export {};
