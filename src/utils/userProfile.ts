import { supabase } from '@/integrations/supabase/client';

export const ensureUserProfile = async () => {
  try {
    // Get the current authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      console.error('No authenticated user found:', authError);
      return false;
    }

    // Check if user profile exists in public.users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking user profile:', fetchError);
      return false;
    }

    // If user doesn't exist, create the profile
    if (!existingUser) {
      console.log('Creating user profile for:', authUser.id);
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          is_verified: authUser.email_confirmed_at ? true : false,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return false;
      }

      console.log('User profile created successfully:', newUser);
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in ensureUserProfile:', error);
    return false;
  }
};
