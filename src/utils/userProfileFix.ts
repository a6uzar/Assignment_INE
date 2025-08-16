import { supabase } from '@/integrations/supabase/client';

// This utility function helps fix user profile issues
export const fixUserProfiles = async () => {
  try {
    console.log('Starting user profile fix...');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('No authenticated user found');
      return { success: false, message: 'Please log in first' };
    }

    console.log('Checking user profile for:', user.id);

    // Check if user exists in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      return { success: false, message: 'Database error while checking user' };
    }

    if (existingUser) {
      console.log('User profile already exists:', existingUser);
      return { success: true, message: 'User profile already exists', user: existingUser };
    }

    // Create user profile
    console.log('Creating user profile...');
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        phone: user.user_metadata?.phone || null,
        is_verified: user.email_confirmed_at ? true : false,
        is_admin: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      return { success: false, message: `Failed to create user profile: ${insertError.message}` };
    }

    console.log('User profile created successfully:', newUser);
    return { success: true, message: 'User profile created successfully', user: newUser };

  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, message: 'Unexpected error occurred' };
  }
};

// Function to check current user status
export const getUserStatus = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { authenticated: false, hasProfile: false };
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      authenticated: true,
      hasProfile: !profileError && !!profile,
      authUser: user,
      profile: profile || null,
      error: profileError?.message || null
    };
  } catch (error) {
    return { authenticated: false, hasProfile: false, error: error.message };
  }
};
