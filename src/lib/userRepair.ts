import { supabase } from '@/integrations/supabase/client';

/**
 * Emergency User Repair Utility
 * Fixes foreign key constraint errors by ensuring authenticated users exist in public.users table
 */

export interface UserRepairResult {
  success: boolean;
  message: string;
  details?: any;
  userId?: string;
}

/**
 * Repairs missing user profile for currently authenticated user
 */
export async function repairCurrentUser(): Promise<UserRepairResult> {
  try {
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return {
        success: false,
        message: `Authentication error: ${authError.message}`,
        details: authError
      };
    }

    if (!user) {
      return {
        success: false,
        message: 'No authenticated user found. Please login first.',
      };
    }

    // Check if user exists in public.users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, full_name, created_at')
      .eq('id', user.id)
      .single();

    // If user exists, no repair needed
    if (existingUser && !checkError) {
      return {
        success: true,
        message: 'User profile already exists - no repair needed',
        details: existingUser,
        userId: user.id
      };
    }

    // If error is not "not found", it's a different issue
    if (checkError && checkError.code !== 'PGRST116') {
      return {
        success: false,
        message: `Database error while checking user: ${checkError.message}`,
        details: checkError
      };
    }

    // User doesn't exist - create the profile
    console.log('Creating missing user profile for:', user.email);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select()
      .single();

    if (createError) {
      return {
        success: false,
        message: `Failed to create user profile: ${createError.message}`,
        details: createError
      };
    }

    return {
      success: true,
      message: 'Successfully created missing user profile!',
      details: newUser,
      userId: user.id
    };

  } catch (error) {
    return {
      success: false,
      message: `Unexpected error during user repair: ${error}`,
      details: error
    };
  }
}

/**
 * Repairs user profile for a specific user ID (admin function)
 */
export async function repairUserById(userId: string): Promise<UserRepairResult> {
  try {
    // Get user from auth.users table
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !user) {
      return {
        success: false,
        message: `Could not find user in auth system: ${authError?.message || 'User not found'}`,
        details: authError
      };
    }

    // Check if user exists in public.users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    if (existingUser && !checkError) {
      return {
        success: true,
        message: 'User profile already exists',
        details: existingUser,
        userId: userId
      };
    }

    // Create user profile
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url || null,
      })
      .select()
      .single();

    if (createError) {
      return {
        success: false,
        message: `Failed to create user profile: ${createError.message}`,
        details: createError
      };
    }

    return {
      success: true,
      message: 'Successfully created user profile',
      details: newUser,
      userId: userId
    };

  } catch (error) {
    return {
      success: false,
      message: `Error repairing user: ${error}`,
      details: error
    };
  }
}

/**
 * Validates that a user can place bids (has valid profile)
 */
export async function validateUserForBidding(): Promise<UserRepairResult> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        message: 'User must be authenticated to place bids'
      };
    }

    // Check if user exists in public.users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return {
        success: false,
        message: `User profile missing - cannot place bids. Error: ${profileError.message}`,
        details: { userId: user.id, error: profileError }
      };
    }

    return {
      success: true,
      message: 'User is valid for bidding',
      details: userProfile,
      userId: user.id
    };

  } catch (error) {
    return {
      success: false,
      message: `Validation error: ${error}`,
      details: error
    };
  }
}
