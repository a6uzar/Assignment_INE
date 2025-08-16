import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export const notificationService = {
  // Get user's notifications
  async getUserNotifications(userId: string, limit = 50) {
    return supabase
      .from('notifications')
      .select(`
        *,
        auctions(id, title, images),
        bids(amount)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  // Get unread notification count
  async getUnreadCount(userId: string) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return count || 0;
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  // Mark all notifications as read for user
  async markAllAsRead(userId: string) {
    return supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    return supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  },

  // Create notification using the database function
  async createNotification(
    userId: string,
    type: Database['public']['Enums']['notification_type'],
    title: string,
    message: string,
    auctionId?: string,
    bidId?: string,
    data?: any
  ) {
    return supabase.rpc('create_notification', {
      p_user_id: userId,
      p_auction_id: auctionId || null,
      p_bid_id: bidId || null,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data || {}
    });
  },

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  },

  // Unsubscribe from notifications
  unsubscribeFromNotifications(channel: any) {
    return supabase.removeChannel(channel);
  },

  // Get notifications by type
  async getNotificationsByType(
    userId: string, 
    type: Database['public']['Enums']['notification_type']
  ) {
    return supabase
      .from('notifications')
      .select(`
        *,
        auctions(id, title, images),
        bids(amount)
      `)
      .eq('user_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false });
  },

  // Get auction-specific notifications
  async getAuctionNotifications(userId: string, auctionId: string) {
    return supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false });
  },
};
