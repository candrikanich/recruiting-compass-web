-- Remove fit_score and fit_score_data columns from schools table
-- These columns stored a pre-calculated composite fit score that has been
-- replaced by two independent, transparent fit signals (personal fit and
-- academic fit) calculated on-the-fly from school academic_info and athlete profile.
ALTER TABLE schools DROP COLUMN IF EXISTS fit_score;
ALTER TABLE schools DROP COLUMN IF EXISTS fit_score_data;
