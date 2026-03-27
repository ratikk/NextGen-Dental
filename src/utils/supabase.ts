import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface HomepageContent {
  id: string;
  hero_heading: string;
  hero_subheading: string;
  cta_primary_text: string;
  cta_secondary_text: string;
  welcome_heading: string;
  welcome_text: string;
  features_heading: string;
}

export interface SiteSettings {
  id: string;
  site_name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  office_hours: string;
  emergency_message: string;
}

export async function getHomepageContent(): Promise<HomepageContent | null> {
  const { data, error } = await supabase
    .from('cms_homepage')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching homepage content:', error);
    return null;
  }

  return data;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const { data, error } = await supabase
    .from('cms_site_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching site settings:', error);
    return null;
  }

  return data;
}
