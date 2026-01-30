-- Add "admin" role to user_role enum
ALTER TYPE user_role ADD VALUE 'admin' BEFORE 'parent';
