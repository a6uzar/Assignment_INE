import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../integrations/supabase/client';

/**
 * Higher-order component that ensures user profile exists before allowing bidding
 */
export function withUserProfileProtection<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function ProtectedComponent(props: T) {
    const { user } = useAuth();
    const [profileExists, setProfileExists] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
      const checkAndCreateProfile = async () => {
        if (!user) {
          setProfileExists(false);
          return;
        }

        setChecking(true);
        
        try {
          // Check if user exists in public.users table
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

          if (checkError && checkError.code === 'PGRST116') {
            // User doesn't exist, create them
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || null,
              });

            if (!createError) {
              setProfileExists(true);
            } else {
              console.error('Failed to create user profile:', createError);
              setProfileExists(false);
            }
          } else if (!checkError) {
            // User exists
            setProfileExists(true);
          } else {
            // Other error
            console.error('Error checking user profile:', checkError);
            setProfileExists(false);
          }
        } catch (error) {
          console.error('Profile check error:', error);
          setProfileExists(false);
        } finally {
          setChecking(false);
        }
      };

      checkAndCreateProfile();
    }, [user]);

    // Show loading state while checking
    if (checking) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-gray-600">Preparing...</span>
        </div>
      );
    }

    // If profile doesn't exist and couldn't be created, show error
    if (profileExists === false && user) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">
            Unable to prepare your account for bidding. Please refresh the page or contact support.
          </p>
        </div>
      );
    }

    // Render the wrapped component normally
    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook to ensure user profile exists before performing bidding actions
 */
export function useEnsureUserProfile() {
  const { user } = useAuth();

  const ensureProfile = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if user exists
      const { data, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // Create user profile
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.email!.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null,
          });

        return !createError;
      }

      return !checkError;
    } catch (error) {
      console.error('Profile ensure error:', error);
      return false;
    }
  };

  return { ensureProfile };
}
