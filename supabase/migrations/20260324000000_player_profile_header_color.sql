-- Allow players to customize their public profile header color
ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS header_color text NOT NULL DEFAULT 'slate';

ALTER TABLE player_profiles
  ADD CONSTRAINT header_color_valid CHECK (
    header_color IN ('slate', 'blue', 'emerald', 'violet', 'rose', 'amber', 'teal', 'indigo')
  );
