import { supabase } from '@/integrations/supabase/client';

// Emergency manual user fix for specific user ID
export async function quickUserFix() {
  const specificUserId = '9f99e588-cbd7-4a9a-a9bd-b04b0ce4377f';
  
  try {
    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || user.id !== specificUserId) {
      console.log('Please login with the affected account first');
      return false;
    }

    // Create the missing user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: specificUserId,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Fix failed:', error);
      return false;
    }

    console.log('User profile created successfully:', data);
    return true;
    
  } catch (error) {
    console.error('Emergency fix error:', error);
    return false;
  }
}

// Call this function in browser console if needed
// window.quickUserFix = quickUserFix;
