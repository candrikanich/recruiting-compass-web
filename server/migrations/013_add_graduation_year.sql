-- Add graduation_year column to users table
ALTER TABLE users
ADD COLUMN graduation_year INTEGER;

-- Add check constraint (reasonable range: 2024-2035)
ALTER TABLE users
ADD CONSTRAINT graduation_year_range CHECK (graduation_year BETWEEN 2024 AND 2035);

-- Create index for performance
CREATE INDEX idx_users_graduation_year ON users(graduation_year);
