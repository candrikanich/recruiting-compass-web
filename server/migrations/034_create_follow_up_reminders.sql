-- Create follow_up_reminders table for tracking reminders linked to interactions
-- This enables users to set follow-up reminders when logging interactions

CREATE TABLE follow_up_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('follow_up', 'deadline', 'custom')),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_follow_up_reminders_user_id ON follow_up_reminders(user_id);
CREATE INDEX idx_follow_up_reminders_school_id ON follow_up_reminders(school_id);
CREATE INDEX idx_follow_up_reminders_coach_id ON follow_up_reminders(coach_id);
CREATE INDEX idx_follow_up_reminders_interaction_id ON follow_up_reminders(interaction_id);
CREATE INDEX idx_follow_up_reminders_due_date ON follow_up_reminders(due_date);
CREATE INDEX idx_follow_up_reminders_is_completed ON follow_up_reminders(is_completed);

-- Create policy to allow users to manage their own reminders
ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders"
  ON follow_up_reminders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders"
  ON follow_up_reminders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders"
  ON follow_up_reminders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
  ON follow_up_reminders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_follow_up_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_up_reminders_updated_at_trigger
BEFORE UPDATE ON follow_up_reminders
FOR EACH ROW
EXECUTE FUNCTION update_follow_up_reminders_updated_at();
