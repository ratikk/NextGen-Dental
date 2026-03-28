import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://urecjwmckpwwfgpbhhlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWNqd21ja3B3d2ZncGJoaGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzU0MzcsImV4cCI6MjA5MDIxMTQzN30.2GmT3iURNYoolc7c4uIImz62yJpBIkmzGKJlprGChfU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  const email = 'admin@nextgendental.com';
  const password = 'Admin123!NextGen';

  console.log('Creating admin user...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined,
        data: {
          role: 'admin'
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✓ Admin user already exists!');
        console.log('');
        console.log('Login credentials:');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('');
        console.log('Admin URL: http://localhost:4321/admin/login');
      } else {
        console.error('Error creating admin user:', error.message);
      }
    } else {
      console.log('✓ Admin user created successfully!');
      console.log('');
      console.log('Login credentials:');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('');
      console.log('Admin URL: http://localhost:4321/admin/login');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createAdminUser();
