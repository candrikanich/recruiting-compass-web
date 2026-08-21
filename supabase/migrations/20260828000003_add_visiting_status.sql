-- Pipeline formalization phase 1a: add the new 'visiting' stage value.
-- Must be a standalone migration — a new enum value cannot be USED in the same
-- transaction that adds it. Data reconciliation follows in 20260828000004.
alter type public.school_status add value if not exists 'visiting';
