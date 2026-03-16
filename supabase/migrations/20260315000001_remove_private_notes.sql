-- Remove private notes columns from schools and coaches tables
-- Private notes are being cut from MVP in favor of the shared notes field

ALTER TABLE schools DROP COLUMN IF EXISTS private_notes;
ALTER TABLE coaches DROP COLUMN IF EXISTS private_notes;
