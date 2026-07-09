-- Add color and archived columns to habits table
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'indigo',
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
