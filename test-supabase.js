// Quick test to verify Supabase connection
// Run this in your browser console on http://localhost:8081

import { supabase } from '@/integrations/supabase/client';

// Test 1: Check connection
console.log('Testing Supabase connection...');

// Test 2: Check auth
supabase.auth.getSession().then(({ data, error }) => {
  console.log('Auth session:', data, error);
});

// Test 3: Try to fetch categories (this will fail until you run the SQL setup)
supabase.from('categories').select('*').then(({ data, error }) => {
  if (error) {
    console.log('Categories table not found - you need to run the SQL setup:', error);
  } else {
    console.log('Categories found:', data);
  }
});

// Test 4: Check if user can sign in
console.log('If you get a "relation does not exist" error, run the QUICK_SETUP.sql in Supabase!');
