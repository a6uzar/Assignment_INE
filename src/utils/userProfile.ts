import { supabase } from '@/integrations/supabase/client';

export const ensureUserProfile = async () => {
  try {
    // Get the current authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      console.error('No authenticated user found:', authError);
      return false;
    }

    console.log('Checking profile for user:', authUser.id);

    // Check if user profile exists in public.users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors

    if (fetchError) {
      console.error('Error checking user profile:', fetchError);
      // Continue to create profile even if check fails
    }

    // If user doesn't exist, create the profile
    if (!existingUser) {
      console.log('Creating user profile for:', authUser.id);

      const userProfile = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        avatar_url: authUser.user_metadata?.avatar_url || null,
        is_verified: !!authUser.email_confirmed_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert(userProfile)
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        // Try alternative approach with upsert
        const { data: upsertUser, error: upsertError } = await supabase
          .from('users')
          .upsert(userProfile, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (upsertError) {
          console.error('Error upserting user profile:', upsertError);
          return false;
        }

        console.log('User profile upserted successfully:', upsertUser);
      } else {
        console.log('User profile created successfully:', newUser);
      }
    } else {
      console.log('User profile already exists:', existingUser.id);
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in ensureUserProfile:', error);
    return false;
  }
};
