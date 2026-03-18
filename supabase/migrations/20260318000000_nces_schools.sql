CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS nces_schools (
  nces_id    text PRIMARY KEY,
  name       text NOT NULL,
  city       text,
  state      char(2),
  zip        text,
  latitude   numeric,
  longitude  numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nces_schools_name_trgm
  ON nces_schools USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS nces_schools_state_idx
  ON nces_schools (state);
