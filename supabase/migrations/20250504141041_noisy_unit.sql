```sql
/*
  # Initial Schema Setup

  1. Tables
    - form_submissions: Store contact and appointment form data
    - rate_limits: Track API rate limiting
    - media_assets: Track uploaded media files
  
  2. Security
    - Row Level Security (RLS) enabled on all tables
    - Rate limiting functions
*/

-- Form submissions table
CREATE TABLE form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL,
  data JSONB NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Rate limiting table
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now()
);

-- Media assets table
CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Rate limiting function
CREATE OR REPLACE FUNCTION increment_rate_limit(key_param TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO rate_limits (key, count)
  VALUES (key_param, 1)
  ON CONFLICT (key) DO UPDATE
  SET count = rate_limits.count + 1,
      window_start = CASE 
        WHEN now() - rate_limits.window_start > interval '1 minute' 
        THEN now() 
        ELSE rate_limits.window_start 
      END;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE now() - window_start > interval '1 hour';
END;
$$ LANGUAGE plpgsql;
```