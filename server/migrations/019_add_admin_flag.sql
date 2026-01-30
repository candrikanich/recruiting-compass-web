-- Add is_admin boolean flag to users table
-- This allows users to have administrative capabilities while maintaining their role
ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;

-- You can manually set admins with:
-- UPDATE users SET is_admin = true WHERE id = '<user_id>';
