-- Add 'interest' to interaction_type so Express-Interest submissions log as
-- their own interaction type. Enum ADD VALUE is non-transactional; keep alone.
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'interest';
