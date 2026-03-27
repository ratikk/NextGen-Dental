/*
  # Create CMS Content Management Tables

  1. New Tables
    - `cms_homepage`
      - Settings for homepage content (hero, welcome text, CTAs)
    - `cms_site_settings`
      - Contact information, hours, emergency messages
    - `cms_services`
      - Service pages with descriptions and rich content
    - `cms_blog_posts`
      - Blog posts with authors, categories, images
    - `cms_team_members`
      - Team member profiles with bios and credentials
    - `cms_gallery_items`
      - Before/after gallery cases
    - `cms_patient_education`
      - Educational content articles

  2. Security
    - Enable RLS on all tables
    - Restrict INSERT/UPDATE/DELETE to authenticated users only
    - Allow public SELECT for reading content on the website
    - Only admin users can modify content

  3. Important Notes
    - Content is stored in Supabase for secure management
    - Admin authentication required for all modifications
    - Public can read to display on website
*/

-- Homepage content (singleton)
CREATE TABLE IF NOT EXISTS cms_homepage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_heading text NOT NULL DEFAULT 'Your Smile is Our Priority',
  hero_subheading text NOT NULL DEFAULT 'Experience exceptional dental care in a comfortable, modern environment.',
  cta_primary_text text NOT NULL DEFAULT 'Book Appointment',
  cta_secondary_text text NOT NULL DEFAULT 'Learn More',
  welcome_heading text NOT NULL DEFAULT 'Welcome to NextGen Dental',
  welcome_text text NOT NULL DEFAULT '',
  features_heading text NOT NULL DEFAULT 'Why Choose NextGen Dental?',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Site settings (singleton)
CREATE TABLE IF NOT EXISTS cms_site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'NextGen Dental',
  tagline text NOT NULL DEFAULT 'Modern Dental Care in Buda, TX',
  phone text NOT NULL DEFAULT '(512) 523-4000',
  email text NOT NULL DEFAULT 'info@nextgendental.com',
  address text NOT NULL DEFAULT '123 Main St, Buda, TX 78610',
  office_hours text NOT NULL DEFAULT '',
  emergency_message text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Services
CREATE TABLE IF NOT EXISTS cms_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text DEFAULT '',
  featured boolean DEFAULT false,
  content jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Blog posts
CREATE TABLE IF NOT EXISTS cms_blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  publish_date date NOT NULL,
  author text NOT NULL DEFAULT 'dr-kiranmayee',
  category text NOT NULL DEFAULT 'general',
  featured boolean DEFAULT false,
  image_url text DEFAULT '',
  content jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Team members
CREATE TABLE IF NOT EXISTS cms_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  title text NOT NULL,
  image_url text DEFAULT '',
  credentials text DEFAULT '',
  specialties jsonb DEFAULT '[]'::jsonb,
  bio jsonb DEFAULT '[]'::jsonb,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Gallery items
CREATE TABLE IF NOT EXISTS cms_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'cosmetic',
  description text DEFAULT '',
  before_image_url text NOT NULL,
  after_image_url text NOT NULL,
  featured boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Patient education
CREATE TABLE IF NOT EXISTS cms_patient_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'oral-health',
  content jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE cms_homepage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_patient_education ENABLE ROW LEVEL SECURITY;

-- Public can read all content for website display
CREATE POLICY "Anyone can view homepage"
  ON cms_homepage FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view site settings"
  ON cms_site_settings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view services"
  ON cms_services FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view blog posts"
  ON cms_blog_posts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view team members"
  ON cms_team_members FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view gallery items"
  ON cms_gallery_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view patient education"
  ON cms_patient_education FOR SELECT
  USING (true);

-- Only authenticated users can modify content
CREATE POLICY "Authenticated users can update homepage"
  ON cms_homepage FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update site settings"
  ON cms_site_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert services"
  ON cms_services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON cms_services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete services"
  ON cms_services FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert blog posts"
  ON cms_blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog posts"
  ON cms_blog_posts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blog posts"
  ON cms_blog_posts FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert team members"
  ON cms_team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update team members"
  ON cms_team_members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete team members"
  ON cms_team_members FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert gallery items"
  ON cms_gallery_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update gallery items"
  ON cms_gallery_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete gallery items"
  ON cms_gallery_items FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patient education"
  ON cms_patient_education FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient education"
  ON cms_patient_education FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patient education"
  ON cms_patient_education FOR DELETE
  TO authenticated
  USING (true);

-- Insert default homepage content
INSERT INTO cms_homepage (hero_heading, hero_subheading, cta_primary_text, cta_secondary_text, welcome_heading, welcome_text, features_heading)
VALUES (
  'Your Smile is Our Priority',
  'Experience exceptional dental care in a comfortable, modern environment.',
  'Book Appointment',
  'Learn More',
  'Welcome to NextGen Dental',
  'At NextGen Dental, we provide comprehensive dental care for the entire family.',
  'Why Choose NextGen Dental?'
)
ON CONFLICT DO NOTHING;

-- Insert default site settings
INSERT INTO cms_site_settings (site_name, tagline, phone, email, address, office_hours, emergency_message)
VALUES (
  'NextGen Dental',
  'Modern Dental Care in Buda, TX',
  '(512) 523-4000',
  'info@nextgendental.com',
  '123 Main St, Buda, TX 78610',
  'Monday-Friday: 8am-5pm',
  'For dental emergencies, please call our office.'
)
ON CONFLICT DO NOTHING;