-- CrimeLens — migration 0006
-- Remove Lost & Found feature: drop lost_items table entirely.

DROP TABLE IF EXISTS lost_items;
