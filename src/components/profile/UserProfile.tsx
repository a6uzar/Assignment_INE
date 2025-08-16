import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Shield,
  Bell,
  Lock,
  CreditCard,
  Activity,
  Camera,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Gavel,
  Heart,
  TrendingUp,
  Award,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  date_of_birth?: string;
  verification_status: 'unverified' | 'pending' | 'verified';
  seller_rating: number;
  buyer_rating: number;
  total_sales: number;
  total_purchases: number;
  member_since: string;
  preferred_categories: string[];
  notification_preferences: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    outbid_alerts: boolean;
    auction_ending_alerts: boolean;
    new_auction_alerts: boolean;
    payment_reminders: boolean;
  };
  privacy_settings: {
    show_real_name: boolean;
    show_location: boolean;
    show_activity: boolean;
    allow_contact: boolean;
  };
}

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'paypal' | 'bank_account';
  last_four: string;
  brand?: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
}

interface UserActivity {
  id: string;
  type: 'bid' | 'win' | 'sell' | 'purchase' | 'review';
  description: string;
  amount?: number;
  auction_title?: string;
  created_at: string;
}

const CATEGORIES = [
  'Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Art', 'Collectibles',
  'Automotive', 'Jewelry', 'Toys', 'Music', 'Health & Beauty', 'Business & Industrial'
];

export function UserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadProfile();
      loadPaymentMethods();
      loadRecentActivity();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      // Mock data - in production this would come from the database
      const mockProfile: UserProfile = {
        id: user?.id || '1',
        email: user?.email || 'user@example.com',
        full_name: 'John Doe',
        avatar_url: '/placeholder.svg',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
        bio: 'Passionate collector of vintage watches and electronics. Been trading on auction platforms for over 5 years.',
        date_of_birth: '1985-06-15',
        verification_status: 'verified',
        seller_rating: 4.8,
        buyer_rating: 4.9,
        total_sales: 127,
        total_purchases: 89,
        member_since: '2019-03-15',
        preferred_categories: ['Electronics', 'Jewelry', 'Collectibles'],
        notification_preferences: {
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          outbid_alerts: true,
          auction_ending_alerts: true,
          new_auction_alerts: false,
          payment_reminders: true,
        },
        privacy_settings: {
          show_real_name: true,
          show_location: false,
          show_activity: true,
          allow_contact: true,
        },
      };

      setProfile(mockProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const mockPaymentMethods: PaymentMethod[] = [
        {
          id: '1',
          type: 'credit_card',
          last_four: '4242',
          brand: 'Visa',
          expiry_month: 12,
          expiry_year: 2027,
          is_default: true,
        },
        {
          id: '2',
          type: 'paypal',
          last_four: '',
          is_default: false,
        },
      ];

      setPaymentMethods(mockPaymentMethods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const mockActivity: UserActivity[] = [
        {
          id: '1',
          type: 'win',
          description: 'Won auction for Vintage Rolex Submariner',
          amount: 2500,
          auction_title: 'Vintage Rolex Submariner',
          created_at: '2024-12-15T14:30:00Z',
        },
        {
          id: '2',
          type: 'bid',
          description: 'Placed bid on MacBook Pro M2',
          amount: 1800,
          auction_title: 'MacBook Pro M2 16-inch',
          created_at: '2024-12-14T09:15:00Z',
        },
        {
          id: '3',
          type: 'sell',
          description: 'Successfully sold iPhone 15 Pro',
          amount: 950,
          auction_title: 'iPhone 15 Pro 256GB',
          created_at: '2024-12-12T16:45:00Z',
        },
      ];

      setRecentActivity(mockActivity);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // In production, update profile in database
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });

      setEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      
      // In production, upload to storage service
      const imageUrl = URL.createObjectURL(file);
      
      setProfile(prev => prev ? { ...prev, avatar_url: imageUrl } : null);
      
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleNotificationChange = (key: keyof UserProfile['notification_preferences'], value: boolean) => {
    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        notification_preferences: {
          ...prev.notification_preferences,
          [key]: value,
        },
      };
    });
  };

  const handlePrivacyChange = (key: keyof UserProfile['privacy_settings'], value: boolean) => {
    setProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        privacy_settings: {
          ...prev.privacy_settings,
          [key]: value,
        },
      };
    });
  };

  const getVerificationBadge = (status: UserProfile['verification_status']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Unverified</Badge>;
    }
  };

  const getActivityIcon = (type: UserActivity['type']) => {
    switch (type) {
      case 'bid':
        return <Gavel className="h-4 w-4 text-blue-600" />;
      case 'win':
        return <Award className="h-4 w-4 text-gold-600" />;
      case 'sell':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'purchase':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback>{profile.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                    <Camera className="h-4 w-4" />
                  </div>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                {getVerificationBadge(profile.verification_status)}
              </div>
              <p className="text-gray-600 mb-4">{profile.bio}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{profile.seller_rating}</span>
                  </div>
                  <p className="text-sm text-gray-600">Seller Rating</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{profile.buyer_rating}</span>
                  </div>
                  <p className="text-sm text-gray-600">Buyer Rating</p>
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-lg">{profile.total_sales}</p>
                  <p className="text-sm text-gray-600">Items Sold</p>
                </div>
                
                <div className="text-center">
                  <p className="font-semibold text-lg">{profile.total_purchases}</p>
                  <p className="text-sm text-gray-600">Items Bought</p>
                </div>
              </div>
            </div>

            <Button
              variant={editing ? "outline" : "default"}
              onClick={() => setEditing(!editing)}
            >
              {editing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    disabled={!editing}
                  />
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    disabled={!editing}
                  />
                </div>
                
                <div>
                  <Label>Location</Label>
                  <Input
                    value={profile.location || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                    disabled={!editing}
                  />
                </div>
                
                <div>
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={profile.date_of_birth || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, date_of_birth: e.target.value } : null)}
                    disabled={!editing}
                  />
                </div>
              </div>
              
              <div>
                <Label>Bio</Label>
                <Textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                  disabled={!editing}
                  rows={3}
                />
              </div>

              <div>
                <Label>Preferred Categories</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CATEGORIES.map(category => (
                    <Badge
                      key={category}
                      variant={profile.preferred_categories.includes(category) ? "default" : "outline"}
                      className={editing ? "cursor-pointer" : ""}
                      onClick={() => {
                        if (!editing) return;
                        setProfile(prev => {
                          if (!prev) return null;
                          const categories = prev.preferred_categories.includes(category)
                            ? prev.preferred_categories.filter(c => c !== category)
                            : [...prev.preferred_categories, category];
                          return { ...prev, preferred_categories: categories };
                        });
                      }}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {editing && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.email_notifications}
                    onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.sms_notifications}
                    onCheckedChange={(checked) => handleNotificationChange('sms_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push Notifications</p>
                    <p className="text-sm text-gray-600">Receive push notifications in your browser</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.push_notifications}
                    onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Outbid Alerts</p>
                    <p className="text-sm text-gray-600">Get notified when someone outbids you</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.outbid_alerts}
                    onCheckedChange={(checked) => handleNotificationChange('outbid_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auction Ending Alerts</p>
                    <p className="text-sm text-gray-600">Get notified when auctions you're bidding on are ending</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.auction_ending_alerts}
                    onCheckedChange={(checked) => handleNotificationChange('auction_ending_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Auction Alerts</p>
                    <p className="text-sm text-gray-600">Get notified about new auctions in your preferred categories</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.new_auction_alerts}
                    onCheckedChange={(checked) => handleNotificationChange('new_auction_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Payment Reminders</p>
                    <p className="text-sm text-gray-600">Get reminded about pending payments</p>
                  </div>
                  <Switch
                    checked={profile.notification_preferences.payment_reminders}
                    onCheckedChange={(checked) => handleNotificationChange('payment_reminders', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control what information is visible to other users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Real Name</p>
                    <p className="text-sm text-gray-600">Display your full name to other users</p>
                  </div>
                  <Switch
                    checked={profile.privacy_settings.show_real_name}
                    onCheckedChange={(checked) => handlePrivacyChange('show_real_name', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Location</p>
                    <p className="text-sm text-gray-600">Display your location to other users</p>
                  </div>
                  <Switch
                    checked={profile.privacy_settings.show_location}
                    onCheckedChange={(checked) => handlePrivacyChange('show_location', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show Activity</p>
                    <p className="text-sm text-gray-600">Allow others to see your bidding activity</p>
                  </div>
                  <Switch
                    checked={profile.privacy_settings.show_activity}
                    onCheckedChange={(checked) => handlePrivacyChange('show_activity', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow Contact</p>
                    <p className="text-sm text-gray-600">Allow other users to contact you directly</p>
                  </div>
                  <Switch
                    checked={profile.privacy_settings.allow_contact}
                    onCheckedChange={(checked) => handlePrivacyChange('allow_contact', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              
              <Button variant="outline" className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
              
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View Login Activity
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent auction activity and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(activity.created_at).toLocaleDateString()} at{' '}
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {activity.amount && (
                      <div className="text-right">
                        <p className="font-semibold">${activity.amount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
