-- Enable Supabase Realtime on documents table.
-- Allows documents page to receive live updates via postgres_changes
-- when a family member uploads, edits, or deletes a document from
-- another device/session.

ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
