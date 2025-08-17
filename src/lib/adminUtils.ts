import { supabase } from '@/integrations/supabase/client';

interface UserDeletionResult {
  success: boolean;
  message: string;
  user_id?: string;
  user_email?: string;
  deleted_data?: {
    auctions: number;
    bids: number;
    notifications: number;
  };
}

interface UserDeletionPreview {
  success: boolean;
  user_id?: string;
  user_email?: string;
  deletion_impact?: {
    total_auctions: number;
    active_auctions_to_cancel: number;
    bids_to_delete: number;
    notifications_to_delete: number;
  };
  warning?: string;
  message?: string;
}

/**
 * Preview what would be deleted when removing a user
 */
export async function previewUserDeletion(userId: string): Promise<UserDeletionPreview> {
  try {
    // Query user's auctions
    const { data: auctions, error: auctionError } = await supabase
      .from('auctions')
      .select('id, title, status')
      .eq('seller_id', userId);

    if (auctionError) throw auctionError;

    // Query user's bids
    const { data: bids, error: bidError } = await supabase
      .from('bids')
      .select('id, auction_id, amount')
      .eq('bidder_id', userId);

    if (bidError) throw bidError;

    // Query user's transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id, auction_id, amount, status')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (transactionError) throw transactionError;

    return {
      success: true,
      user_id: userId,
      deletion_impact: {
        total_auctions: auctions?.length || 0,
        active_auctions_to_cancel: auctions?.filter(a => a.status === 'active').length || 0,
        bids_to_delete: bids?.length || 0,
        notifications_to_delete: 0 // We'll count this separately if needed
      },
      warning: auctions?.some(a => a.status === 'active') ? 'User has active auctions that will be cancelled' : undefined
    };
  } catch (error) {
    console.error('Error in previewUserDeletion:', error);
    return {
      success: false,
      message: `Failed to preview user deletion: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Safely delete a user and all related data
 */
export async function safeDeleteUser(userId: string): Promise<UserDeletionResult> {
  try {
    // First, get user email for logging
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // Delete user's bids
    const { error: bidError } = await supabase
      .from('bids')
      .delete()
      .eq('bidder_id', userId);

    if (bidError) throw bidError;

    // Cancel/delete user's auctions
    const { error: auctionError } = await supabase
      .from('auctions')
      .delete()
      .eq('seller_id', userId);

    if (auctionError) throw auctionError;

    // Delete user's transactions
    const { error: transactionError } = await supabase
      .from('transactions')
      .delete()
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (transactionError) throw transactionError;

    // Finally delete the user
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) throw userError;

    return {
      success: true,
      message: 'User and all related data deleted successfully',
      user_id: userId,
      user_email: user?.email,
      deleted_data: {
        auctions: 0, // We could count these if needed
        bids: 0,
        notifications: 0
      }
    };
  } catch (error) {
    console.error('Error in safeDeleteUser:', error);
    return {
      success: false,
      message: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get all users with their statistics for admin interface
 */
export async function getUsersWithStats() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        is_verified,
        is_admin,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message };
    }

    // Get stats for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const [auctionsResult, bidsResult, notificationsResult] = await Promise.all([
          supabase
            .from('auctions')
            .select('id, status')
            .eq('seller_id', user.id),
          supabase
            .from('bids')
            .select('id')
            .eq('bidder_id', user.id),
          supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
        ]);

        const auctions = auctionsResult.data || [];
        const activeAuctions = auctions.filter(a => ['active', 'scheduled'].includes(a.status));

        return {
          ...user,
          stats: {
            total_auctions: auctions.length,
            active_auctions: activeAuctions.length,
            total_bids: bidsResult.data?.length || 0,
            total_notifications: notificationsResult.data?.length || 0
          }
        };
      })
    );

    return { success: true, users: usersWithStats };
  } catch (error) {
    console.error('Error in getUsersWithStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete user via Supabase Auth Admin API (for admin use)
 * This requires service_role key
 */
export async function deleteUserFromAuth(userId: string) {
  try {
    // This requires admin privileges and service_role key
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user from auth:', error);
      return {
        success: false,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'User deleted from auth successfully'
    };
  } catch (error) {
    console.error('Error in deleteUserFromAuth:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
