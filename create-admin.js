import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://urecjwmckpwwfgpbhhlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyZWNqd21ja3B3d2ZncGJoaGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzU0MzcsImV4cCI6MjA5MDIxMTQzN30.2GmT3iURNYoolc7c4uIImz62yJpBIkmzGKJlprGChfU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const email = 'admin@nextgendental.com';
const password = 'Admin123!NextGen';

console.log('Creating admin user...');
console.log('Email:', email);
console.log('Password:', password);
console.log('');

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
  console.error('Error creating admin user:', error.message);
  process.exit(1);
}

if (data.user) {
  console.log('✓ Admin user created successfully!');
  console.log('');
  console.log('Admin Login Credentials:');
  console.log('========================');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('');
  console.log('Admin URL: http://localhost:4321/admin/login');
  console.log('');
  console.log('Note: Email confirmation is disabled, so you can log in immediately.');
} else {
  console.error('Error: User was not created');
  process.exit(1);
}
