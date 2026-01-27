# Recruiting Compass: Database Schema Documentation

Complete database schema for Recruiting Compass, including table definitions, relationships, and Row-Level Security policies.

---

## Overview

Recruiting Compass uses PostgreSQL (via Supabase) with Row-Level Security (RLS) to ensure data privacy and security. Each user can only access their own data and data shared with them (e.g., parents viewing athlete's data).

**Database Principles:**
- User-scoped data: All data belongs to a user and is protected by RLS
- Parent-scoped data: Parents can view athlete data when invited
- No direct coach access: Coaches never see internal data
- Soft deletes: Most data is soft-deleted (flag, not actually deleted)
- Audit trails: Created/updated timestamps on all records

---

## Entity-Relationship Diagram

```
users (1)
  ├─ (1:N)─ schools
  │           ├─ (1:N)─ coaches
  │           │         └─ (1:N)─ interactions
  │           └─ (1:N)─ fit_scores
  ├─ (1:N)─ timeline_tasks
  ├─ (1:N)─ timeline_phases
  ├─ (1:N)─ events
  ├─ (1:N)─ documents
  ├─ (1:N)─ performance_metrics
  ├─ (1:N)─ suggestions
  ├─ (1:N)─ offers
  └─ (1:N)─ account_links (to other users)
```

---

## Core Tables

### 1. `users` Table

Stores user account information (athletes and parents).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role ENUM('athlete', 'parent', 'coach', 'admin') NOT NULL DEFAULT 'athlete',
  high_school VARCHAR(255),
  graduation_year INTEGER,
  primary_position VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Key Fields:**
- `id`: UUID from Supabase Auth
- `email`: Login email
- `role`: User type (athlete is primary, parent is secondary)
- `graduation_year`: High school graduation year (e.g., 2025)
- `primary_position`: Baseball position (e.g., "Shortstop")

**Indexes:**
- `idx_users_email` (unique)
- `idx_users_deleted_at` (for soft delete queries)

**RLS Policy:**
- Users can view their own profile
- Parents can view linked athlete profile (via `account_links`)

---

### 2. `user_profiles` Table

Extended profile information (academic, athletic, preferences).

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unweighted_gpa DECIMAL(3, 2),
  weighted_gpa DECIMAL(3, 2),
  sat_score INTEGER,
  act_score INTEGER,
  test_date DATE,
  preferred_major VARCHAR(255),
  secondary_position VARCHAR(100),
  dominant_hand ENUM('left', 'right'),
  height_inches INTEGER,
  weight_lbs INTEGER,
  team_type VARCHAR(100),
  current_team VARCHAR(255),
  target_divisions TEXT[] (e.g., ['D1', 'D2']),
  target_regions TEXT[] (e.g., ['California', 'Texas']),
  distance_from_home_preference VARCHAR(50),
  school_size_preference VARCHAR(50),
  scholarship_priority VARCHAR(50),
  phone_number VARCHAR(20),
  preferred_contact_method ENUM('phone', 'email', 'text'),
  best_contact_times VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `unweighted_gpa`: GPA (e.g., 3.85)
- `sat_score`, `act_score`: Standardized test scores
- `target_divisions`: Array of division levels user is targeting
- `target_regions`: Array of states/regions

**Indexes:**
- `idx_user_profiles_user_id`

**RLS Policy:**
- Users can only update their own profile
- Parents can view linked athlete profile (read-only)

---

### 3. `schools` Table

Target schools in athlete's recruiting list.

```sql
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  state VARCHAR(2),
  city VARCHAR(100),
  division_level ENUM('D1', 'D2', 'D3', 'JUCO', 'NAIA'),
  priority_tier ENUM('reach', 'target', 'safety'),
  founded_year INTEGER,
  student_population INTEGER,
  logo_url VARCHAR(255),
  school_url VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `user_id`: Athlete who added this school
- `priority_tier`: Reach, Target, or Safety
- `division_level`: D1, D2, D3, JUCO, NAIA
- `is_active`: Soft delete flag

**Indexes:**
- `idx_schools_user_id`
- `idx_schools_is_active`
- `idx_schools_division_level`

**RLS Policy:**
- Users can only see/edit their own schools
- Parents can view linked athlete schools

---

### 4. `coaches` Table

Coaches at target schools.

```sql
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_name VARCHAR(255) NOT NULL,
  position_title VARCHAR(100),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  position_focus VARCHAR(100),
  years_at_program INTEGER,
  coaching_background TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `school_id`: School where coach works
- `user_id`: Athlete tracking this coach
- `position_title`: Role at school (e.g., "Head Coach", "Pitching Coach")
- `position_focus`: Positions they recruit (e.g., "Shortstop, 2B")

**Indexes:**
- `idx_coaches_user_id`
- `idx_coaches_school_id`
- `idx_coaches_email`

**RLS Policy:**
- Users can only see coaches they added
- Parents can view linked athlete coaches

---

### 5. `interactions` Table

Interactions (emails, calls, meetings) with coaches.

```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type ENUM(
    'email_sent',
    'email_received',
    'phone_call',
    'text_message',
    'in_person_meeting',
    'showcase',
    'tournament',
    'coach_visit',
    'campus_visit',
    'video_call',
    'other'
  ),
  interaction_date DATE NOT NULL,
  duration_minutes INTEGER,
  notes TEXT,
  outcome ENUM('positive', 'neutral', 'no_response', null),
  response_time_hours INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `interaction_type`: Type of communication
- `interaction_date`: When it happened (not necessarily today)
- `outcome`: How it went (positive/neutral/no response)
- `response_time_hours`: How long coach took to respond

**Indexes:**
- `idx_interactions_user_id`
- `idx_interactions_coach_id`
- `idx_interactions_interaction_date`

**RLS Policy:**
- Users can only view their own interactions
- Parents can view linked athlete interactions

---

### 6. `timeline_phases` Table

The four recruiting phases for each athlete.

```sql
CREATE TABLE timeline_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_name ENUM('freshman', 'sophomore', 'junior', 'senior'),
  phase_number INTEGER (1-4),
  current_phase BOOLEAN DEFAULT FALSE,
  started_at DATE,
  completed_at DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `phase_name`: Freshman, Sophomore, Junior, Senior
- `current_phase`: Which phase is user in now
- `started_at`: When they started this phase
- `completed_at`: When they advanced to next phase

**Indexes:**
- `idx_timeline_phases_user_id`
- `idx_timeline_phases_current_phase`

**RLS Policy:**
- Users can only view/edit their own phases

---

### 7. `timeline_tasks` Table

Tasks within each timeline phase.

```sql
CREATE TABLE timeline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES timeline_phases(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  description TEXT,
  task_order INTEGER,
  is_complete BOOLEAN DEFAULT FALSE,
  completed_at DATE,
  depends_on_task_id UUID REFERENCES timeline_tasks(id),
  is_locked BOOLEAN DEFAULT FALSE (unlock when dependency complete),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `phase_id`: Which phase this task belongs to
- `is_complete`: Task completion status
- `depends_on_task_id`: Task dependencies (lock until dependency completes)
- `task_order`: Display order within phase

**Indexes:**
- `idx_timeline_tasks_user_id`
- `idx_timeline_tasks_phase_id`

**RLS Policy:**
- Users can only view/edit their own tasks

---

### 8. `fit_scores` Table

Calculated fit score for each school.

```sql
CREATE TABLE fit_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  overall_score INTEGER (1-10),
  academic_score INTEGER (1-10),
  athletic_score INTEGER (1-10),
  location_score INTEGER (1-10),
  program_score INTEGER (1-10),
  financial_score INTEGER (1-10),
  calculation_details JSONB, -- stores how score was calculated
  last_calculated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `overall_score`: 1-10 scale
- `academic_score`, `athletic_score`, etc.: Breakdown by category
- `calculation_details`: JSON storing the calculation (weights, factors)

**Indexes:**
- `idx_fit_scores_user_id`
- `idx_fit_scores_school_id`

**RLS Policy:**
- Users can only view their own fit scores

---

### 9. `events` Table

Recruiting events (showcases, tournaments, visits, camps).

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  event_type ENUM('showcase', 'tournament', 'camp', 'coach_visit', 'campus_visit', 'recruiting_expo'),
  event_date DATE NOT NULL,
  location VARCHAR(255),
  description TEXT,
  coaches_attending UUID[] (references coaches),
  registered BOOLEAN DEFAULT FALSE,
  attended BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `event_type`: Type of event
- `coaches_attending`: Array of coach IDs expected there
- `attended`: Whether user attended

**Indexes:**
- `idx_events_user_id`
- `idx_events_event_date`

**RLS Policy:**
- Users can only view/edit their own events

---

### 10. `documents` Table

Uploaded documents (highlights, transcripts, stats, etc.).

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type ENUM('highlights', 'transcripts', 'stats', 'recruiting_survey', 'other'),
  description TEXT,
  file_url VARCHAR(255) NOT NULL,
  file_size_mb DECIMAL(5, 2),
  upload_date DATE DEFAULT NOW(),
  is_shareable BOOLEAN DEFAULT FALSE,
  share_token VARCHAR(255) UNIQUE, -- for generating shareable links
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `file_url`: URL to stored document (S3 or Supabase Storage)
- `is_shareable`: Can be shared with coaches
- `share_token`: Unique token for shareable link

**Indexes:**
- `idx_documents_user_id`
- `idx_documents_share_token`

**RLS Policy:**
- Users can only view/manage their own documents
- Anyone with share token can view document (via public policy)

---

### 11. `performance_metrics` Table

Athletic stats and measurements.

```sql
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_type ENUM('dash_60', 'exit_velocity', 'fastball_velocity', 'vertical_jump', 'batting_average', 'era', 'fielding_percent', 'other'),
  metric_value DECIMAL(5, 2),
  metric_unit VARCHAR(50), -- 'seconds', 'mph', 'percent', etc.
  measurement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `metric_type`: Type of measurement
- `metric_value`: The value (e.g., 6.8 for 60-yard dash)
- `measurement_date`: When measurement was taken

**Indexes:**
- `idx_performance_metrics_user_id`
- `idx_performance_metrics_measurement_date`

**RLS Policy:**
- Users can only view/edit their own metrics
- Parents can view linked athlete metrics

---

### 12. `suggestions` Table

AI-generated suggestions for user action.

```sql
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suggestion_type ENUM('follow_up', 'school_match', 'activity', 'phase_advance', 'other'),
  suggestion_text VARCHAR(500),
  related_coach_id UUID REFERENCES coaches(id),
  related_school_id UUID REFERENCES schools(id),
  priority ENUM('high', 'medium', 'low'),
  action_suggestion TEXT,
  is_acted_on BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `suggestion_type`: Type of suggestion (follow-up, school, activity)
- `related_coach_id`: Which coach if applicable
- `priority`: High, medium, low
- `is_acted_on`: Whether user acted on suggestion

**Indexes:**
- `idx_suggestions_user_id`
- `idx_suggestions_created_at`

**RLS Policy:**
- Users can only view their own suggestions

---

### 13. `offers` Table

Scholarship offers from schools (coming in v1.1).

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  offer_date DATE NOT NULL,
  scholarship_amount DECIMAL(10, 2),
  scholarship_type ENUM('full_ride', 'partial', 'academic_merit', 'none'),
  offer_details JSONB, -- flexible schema for offer terms
  deadline_to_respond DATE,
  status ENUM('pending', 'accepted', 'declined', 'deferred'),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Fields:**
- `scholarship_amount`: Dollar amount of scholarship
- `deadline_to_respond`: When athlete needs to decide
- `status`: Current status of offer

**Indexes:**
- `idx_offers_user_id`
- `idx_offers_school_id`

**RLS Policy:**
- Users can only view their own offers

---

### 14. `account_links` Table

Link parents to athlete accounts.

```sql
CREATE TABLE account_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship_type ENUM('parent', 'guardian', 'coach', 'advisor'),
  approved_at DATE,
  access_level ENUM('view_only', 'view_and_comment', 'full_access'),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(athlete_user_id, parent_user_id)
);
```

**Key Fields:**
- `athlete_user_id`: The primary athlete
- `parent_user_id`: The parent/guardian
- `access_level`: What parent can do
- `approved_at`: When athlete approved the link

**Indexes:**
- `idx_account_links_athlete_user_id`
- `idx_account_links_parent_user_id`

**RLS Policy:**
- Athletes can see links to them and manage them
- Parents can see links to athletes they have access to

---

## Row-Level Security (RLS) Policies

### Basic RLS Pattern

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
-- etc.

-- Example: Schools table - users can only see their own
CREATE POLICY "Users can view their own schools"
  ON schools
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert schools"
  ON schools
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schools"
  ON schools
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Parent viewing athlete schools (via account_links)
CREATE POLICY "Parents can view linked athlete schools"
  ON schools
  FOR SELECT
  USING (
    user_id IN (
      SELECT athlete_user_id FROM account_links
      WHERE parent_user_id = auth.uid()
        AND access_level != 'none'
    )
  );
```

### Master RLS Function

```sql
-- Helper function for parent access
CREATE OR REPLACE FUNCTION is_parent_of(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_links
    WHERE athlete_user_id = target_user_id
      AND parent_user_id = auth.uid()
      AND approved_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Then in policies:
CREATE POLICY "Can view if own data or parent of user"
  ON schools
  FOR SELECT
  USING (
    user_id = auth.uid() OR is_parent_of(user_id)
  );
```

---

## Indexes & Performance

### Critical Indexes

```sql
-- User lookups
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_email ON users(email) UNIQUE;

-- Common queries
CREATE INDEX idx_schools_user_id ON schools(user_id);
CREATE INDEX idx_schools_user_active ON schools(user_id, is_active);
CREATE INDEX idx_coaches_user_id ON coaches(user_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_coach_id ON interactions(coach_id);
CREATE INDEX idx_interactions_date ON interactions(interaction_date DESC);

-- Fit score lookups
CREATE INDEX idx_fit_scores_user_school ON fit_scores(user_id, school_id) UNIQUE;

-- Account links for parent access
CREATE INDEX idx_account_links_athlete_parent ON account_links(athlete_user_id, parent_user_id);
```

### Query Patterns

**Get athlete's schools:**
```sql
SELECT * FROM schools WHERE user_id = $1 AND is_active = TRUE;
```

**Get coaches for a school:**
```sql
SELECT * FROM coaches WHERE school_id = $1 AND is_active = TRUE;
```

**Get interaction history:**
```sql
SELECT * FROM interactions
WHERE coach_id = $1
ORDER BY interaction_date DESC;
```

**Get responsiveness score for coach:**
```sql
SELECT
  COUNT(*) as total_interactions,
  AVG(response_time_hours) as avg_response_time,
  COUNT(CASE WHEN outcome = 'positive' THEN 1 END) as positive_responses
FROM interactions
WHERE coach_id = $1;
```

---

## Data Constraints & Validations

### Foreign Key Constraints
- All user_id references include `ON DELETE CASCADE`
- All coach_id references include `ON DELETE CASCADE`
- No orphaned records

### Unique Constraints
- `users(email)` - Email is unique identifier
- `documents(share_token)` - Share tokens are unique
- `account_links(athlete_user_id, parent_user_id)` - One link per pair

### Check Constraints
- `fit_scores` - Scores between 1-10
- `interactions.duration_minutes` - Must be positive
- `offers.scholarship_amount` - Must be positive

---

## Backup & Disaster Recovery

- **Automatic backups**: Supabase creates daily backups
- **Point-in-time recovery**: 7-day retention (upgradeable)
- **Retention policy**: User data deleted 30 days after account deletion

---

## Migrations

Database schema is versioned and managed via Supabase migrations. See `/migrations/` for historical changes.

**Current Version:** 1.0 (MVP)

---

**Schema Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Production-ready for MVP launch
