import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  Gavel,
  Crown,
  Target,
  Clock,
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Award,
  Zap,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type NotificationType = 
  | 'outbid' 
  | 'bid_placed' 
  | 'auction_won' 
  | 'auction_ended' 
  | 'auction_ending'
  | 'counter_offer' 
  | 'offer_accepted' 
  | 'offer_rejected'
  | 'bid_accepted'
  | 'bid_rejected';

interface Notification {
  id: string;
  user_id: string;
  auction_id?: string;
  bid_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  is_email_sent: boolean;
  created_at: string;
  auction?: {
    id: string;
    title: string;
    current_price: number;
  };
}

interface NotificationSettings {
  bid_notifications: boolean;
  auction_updates: boolean;
  chat_mentions: boolean;
  milestone_alerts: boolean;
  ending_reminders: boolean;
  sound_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface SmartNotificationsProps {
  userId?: string;
  compact?: boolean;
  showSettings?: boolean;
  className?: string;
}

const NOTIFICATION_ICONS = {
  outbid: Gavel,
  auction_ended: Clock,
  auction_ending: Clock,
  auction_won: Crown,
  bid_placed: TrendingUp,
  counter_offer: Target,
  offer_accepted: CheckCircle,
  offer_rejected: X,
  bid_accepted: Award,
  bid_rejected: AlertTriangle,
} as const;

const NOTIFICATION_COLORS = {
  outbid: 'text-orange-500 bg-orange-50 border-orange-200',
  auction_ended: 'text-red-500 bg-red-50 border-red-200',
  auction_ending: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  auction_won: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  bid_placed: 'text-green-500 bg-green-50 border-green-200',
  counter_offer: 'text-purple-500 bg-purple-50 border-purple-200',
  offer_accepted: 'text-blue-500 bg-blue-50 border-blue-200',
  offer_rejected: 'text-gray-500 bg-gray-50 border-gray-200',
  bid_accepted: 'text-indigo-500 bg-indigo-50 border-indigo-200',
  bid_rejected: 'text-red-500 bg-red-50 border-red-200',
  system: 'text-gray-500 bg-gray-50 border-gray-200',
} as const;

const DEFAULT_SETTINGS: NotificationSettings = {
  bid_notifications: true,
  auction_updates: true,
  chat_mentions: true,
  milestone_alerts: true,
  ending_reminders: true,
  sound_enabled: true,
  email_notifications: false,
  push_notifications: true,
};

export function SmartNotifications({
  userId,
  compact = false,
  showSettings = false,
  className
}: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Request notification permissions
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setIsNotificationsEnabled(permission === 'granted');
      return permission === 'granted';
    }
    return false;
  };

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (settings.sound_enabled && isNotificationsEnabled) {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Fallback: silent for now
        console.log('Notification sound failed to play');
      });
    }
  }, [settings.sound_enabled, isNotificationsEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (!isNotificationsEnabled || !settings.push_notifications) return;

    new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.type === 'auction_ending',
    });
  }, [isNotificationsEnabled, settings.push_notifications]);

  // Fetch notifications - Mock implementation
  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      // Mock notifications data - replace with actual Supabase call when notifications table exists
      const mockData: Notification[] = [
        {
          id: '1',
          user_id: userId,
          auction_id: 'auction1',
          type: 'bid_placed',
          title: 'Bid placed successfully',
          message: 'Your bid of $1,250 was placed on "Vintage Watch Collection"',
          data: { amount: 1250, auctionTitle: 'Vintage Watch Collection' },
          is_read: false,
          is_email_sent: false,
          created_at: new Date().toISOString(),
          auction: {
            id: 'auction1',
            title: 'Vintage Watch Collection',
            current_price: 1250
          }
        }
      ];

      setNotifications(mockData);
      setUnreadCount(mockData.filter(n => !n.is_read).length);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read - Mock implementation
  const markAsRead = async (notificationId: string) => {
    try {
      // Mock implementation - replace with actual Supabase call when notifications table exists
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read - Mock implementation
  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      // Mock implementation - replace with actual Supabase call when notifications table exists
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast({
        title: "All notifications marked as read",
        duration: 2000,
      });

    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification - Mock implementation
  const deleteNotification = async (notificationId: string) => {
    try {
      // Mock implementation - replace with actual Supabase call when notifications table exists
      const notification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);

    // Save to localStorage or user preferences
    localStorage.setItem('notification-settings', JSON.stringify(updatedSettings));

    toast({
      title: "Settings updated",
      description: "Your notification preferences have been saved",
      duration: 2000,
    });
  };

  // Create smart notification based on auction activity - Mock implementation
  const createSmartNotification = async (
    type: Notification['type'],
    auctionId: string,
    data: Record<string, any>
  ) => {
    if (!userId) return;

    const notificationTemplates = {
      outbid: {
        title: 'You\'ve been outbid!',
        message: `Someone placed a higher bid of $${data.newBid?.toLocaleString()} on "${data.auctionTitle}"`,
      },
      auction_ended: {
        title: 'Auction ended',
        message: `"${data.auctionTitle}" has ended`,
      },
      auction_ending: {
        title: 'Auction ending soon',
        message: `"${data.auctionTitle}" is ending in ${data.timeLeft || '5 minutes'}`,
      },
      auction_won: {
        title: 'Congratulations! You won!',
        message: `You won "${data.auctionTitle}" for $${data.winningBid?.toLocaleString()}`,
      },
      bid_placed: {
        title: 'Bid placed successfully',
        message: `Your bid of $${data.amount?.toLocaleString()} was placed on "${data.auctionTitle}"`,
      },
      counter_offer: {
        title: 'Counter offer received',
        message: `You received a counter offer of $${data.amount?.toLocaleString()} on "${data.auctionTitle}"`,
      },
      offer_accepted: {
        title: 'Offer accepted',
        message: `Your offer was accepted for "${data.auctionTitle}"`,
      },
      offer_rejected: {
        title: 'Offer rejected',
        message: `Your offer was rejected for "${data.auctionTitle}"`,
      },
      bid_accepted: {
        title: 'Bid accepted',
        message: `Your bid was accepted for "${data.auctionTitle}"`,
      },
      bid_rejected: {
        title: 'Bid rejected',
        message: `Your bid was rejected for "${data.auctionTitle}"`,
      },
    };

    const template = notificationTemplates[type];
    if (!template) return;

    try {
      // Mock notification creation - replace with actual Supabase call when notifications table exists
      console.log('Mock notification created:', {
        user_id: userId,
        auction_id: auctionId,
        type,
        title: template.title,
        message: template.message,
        data: JSON.stringify(data),
      });

      // Add to local notifications list for demo purposes
      const newNotification: Notification = {
        id: Date.now().toString(),
        user_id: userId,
        auction_id: auctionId,
        type,
        title: template.title,
        message: template.message,
        data: data,
        is_read: false,
        is_email_sent: false,
        created_at: new Date().toISOString(),
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep only 50 notifications

      // Show browser notification if enabled
      if (settings.push_notifications && template) {
        const mockNotification = newNotification;
        showBrowserNotification(mockNotification);
      }

    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Setup real-time subscriptions - Mock implementation
  useEffect(() => {
    if (!userId) return;

    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notification-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Request notification permission
    requestNotificationPermission();

    // Mock fetch notifications - replace with actual call when notifications table exists
    const mockNotifications: Notification[] = [
      {
        id: '1',
        user_id: userId,
        auction_id: 'auction1',
        type: 'bid_placed',
        title: 'Bid placed successfully',
        message: 'Your bid of $1,250 was placed on "Vintage Watch Collection"',
        data: { amount: 1250, auctionTitle: 'Vintage Watch Collection' },
        is_read: false,
        is_email_sent: false,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        user_id: userId,
        auction_id: 'auction2',
        type: 'outbid',
        title: 'You\'ve been outbid!',
        message: 'Someone placed a higher bid of $2,100 on "Antique Furniture Set"',
        data: { newBid: 2100, auctionTitle: 'Antique Furniture Set' },
        is_read: true,
        is_email_sent: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.is_read).length);

    // Mock subscription cleanup function
    return () => {
      console.log('Mock subscription cleanup');
    };
  }, [userId, showBrowserNotification, playNotificationSound]);

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
        >
          {unreadCount > 0 ? (
            <Bell className="h-4 w-4 text-orange-500" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        <AnimatePresence>
          {showSettingsPanel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 z-50 mt-2 w-80 bg-white border rounded-lg shadow-lg"
            >
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSettingsPanel(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-64">
                <div className="p-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notification) => {
                      const IconComponent = NOTIFICATION_ICONS[notification.type] || Info;
                      const colorClasses = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.system;

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-all hover:bg-gray-50",
                            !notification.is_read && "bg-blue-50 border-blue-200",
                            notification.is_read && "bg-white border-gray-200"
                          )}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className={cn("p-1 rounded", colorClasses)}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>

                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span>Smart Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showSettings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Settings Panel */}
        <AnimatePresence>
          {showSettingsPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3"
            >
              <h4 className="font-medium text-sm">Notification Settings</h4>
              
              <div className="space-y-2">
                {Object.entries(settings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        updateSettings({ [key]: checked } as Partial<NotificationSettings>)
                      }
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No notifications</h3>
                <p className="text-sm">You'll see auction updates and alerts here</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const IconComponent = NOTIFICATION_ICONS[notification.type] || Info;
                const colorClasses = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.system;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      !notification.is_read 
                        ? "bg-blue-50 border-blue-200 shadow-sm" 
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("p-2 rounded-full", colorClasses)}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          {notification.auction && (
                            <div className="text-xs text-gray-500">
                              Auction: {notification.auction.title}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 w-6 p-0"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
