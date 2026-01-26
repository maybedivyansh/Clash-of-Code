-- Migration for Serverless Architecture

-- Add columns for tracking test completion and end time
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS p1_tests_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS p2_tests_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ended_at timestamptz;

-- Ensure Realtime is enabled for matches
alter publication supabase_realtime add table matches;
