-- Create user_deadlines table for tracking user-specific deadlines
CREATE TABLE IF NOT EXISTS user_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  deadline_date DATE NOT NULL,
  category TEXT NOT NULL,
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_deadlines_user_id ON user_deadlines(user_id);
CREATE INDEX IF NOT EXISTS idx_user_deadlines_deadline_date ON user_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_user_deadlines_category ON user_deadlines(category);

-- Enable RLS
ALTER TABLE user_deadlines ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own deadlines
CREATE POLICY "user_deadlines_select" ON user_deadlines
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_deadlines_insert" ON user_deadlines
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_deadlines_update" ON user_deadlines
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_deadlines_delete" ON user_deadlines
FOR DELETE USING (auth.uid() = user_id);