import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  Settings,
  Zap,
  Send,
  RefreshCw,
  FileText,
  Users,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomatedEmailSystemProps {
  className?: string;
}

interface EmailAutomation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  isEnabled: boolean;
  emailsSent: number;
  lastSent?: string;
  template: {
    subject: string;
    content: string;
  };
}

interface EmailStats {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

const EMAIL_AUTOMATIONS: EmailAutomation[] = [
  {
    id: 'auction_won',
    name: 'Auction Won Confirmation',
    description: 'Sent immediately when a user wins an auction',
    trigger: 'auction_ended_with_winner',
    isEnabled: true,
    emailsSent: 127,
    lastSent: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    template: {
      subject: 'Congratulations! You won {{auction_title}}',
      content: `
        <h2>🎉 Congratulations on your winning bid!</h2>
        <p>You have successfully won the auction for <strong>{{auction_title}}</strong>.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Auction Details:</h3>
          <p><strong>Winning Bid:</strong> $\{winning_amount}</p>
          <p><strong>Seller:</strong> {{seller_name}}</p>
          <p><strong>Auction End:</strong> {{end_date}}</p>
        </div>
        <p>Please proceed with payment within 48 hours to complete the transaction.</p>
        <a href="{{payment_link}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Payment</a>
      `
    }
  },
  {
    id: 'outbid_notification',
    name: 'Outbid Alert',
    description: 'Sent when a user is outbid on an auction they were winning',
    trigger: 'user_outbid',
    isEnabled: true,
    emailsSent: 89,
    lastSent: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    template: {
      subject: 'You have been outbid on {{auction_title}}',
      content: `
        <h2>⚠️ You've been outbid!</h2>
        <p>Someone has placed a higher bid on <strong>{{auction_title}}</strong>.</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Current Status:</h3>
          <p><strong>Current Highest Bid:</strong> $\{current_bid}</p>
          <p><strong>Your Bid:</strong> $\{your_bid}</p>
          <p><strong>Time Remaining:</strong> {{time_remaining}}</p>
        </div>
        <p>Don't miss out! Place a higher bid to stay in the running.</p>
        <a href="{{auction_link}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Place New Bid</a>
      `
    }
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    description: 'Sent 24 hours after auction win if payment is pending',
    trigger: 'payment_overdue_24h',
    isEnabled: true,
    emailsSent: 23,
    lastSent: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    template: {
      subject: 'Payment reminder for {{auction_title}}',
      content: `
        <h2>💳 Payment Reminder</h2>
        <p>This is a friendly reminder that payment is due for your winning bid on <strong>{{auction_title}}</strong>.</p>
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <p><strong>Amount Due:</strong> $\{amount_due}</p>
          <p><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Please complete your payment to secure your purchase.</p>
        <a href="{{payment_link}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a>
      `
    }
  },
  {
    id: 'shipping_notification',
    name: 'Shipping Confirmation',
    description: 'Sent when seller updates shipping information',
    trigger: 'item_shipped',
    isEnabled: true,
    emailsSent: 95,
    lastSent: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    template: {
      subject: 'Your item has been shipped - {{auction_title}}',
      content: `
        <h2>📦 Your item is on the way!</h2>
        <p>Great news! Your item <strong>{{auction_title}}</strong> has been shipped.</p>
        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Shipping Details:</h3>
          <p><strong>Tracking Number:</strong> {{tracking_number}}</p>
          <p><strong>Carrier:</strong> {{carrier}}</p>
          <p><strong>Estimated Delivery:</strong> {{estimated_delivery}}</p>
        </div>
        <p>You can track your package using the tracking number above.</p>
        <a href="{{tracking_link}}" style="background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Package</a>
      `
    }
  },
  {
    id: 'auction_ending_soon',
    name: 'Auction Ending Soon',
    description: 'Sent 1 hour before auction ends to interested users',
    trigger: 'auction_ending_1h',
    isEnabled: false,
    emailsSent: 156,
    lastSent: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    template: {
      subject: 'Hurry! {{auction_title}} ends in 1 hour',
      content: `
        <h2>⏰ Auction ending soon!</h2>
        <p>The auction for <strong>{{auction_title}}</strong> is ending in less than 1 hour.</p>
        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Final Details:</h3>
          <p><strong>Current Bid:</strong> $\{current_bid}</p>
          <p><strong>Ends At:</strong> {{end_time}}</p>
          <p><strong>Watchers:</strong> {{watchers_count}}</p>
        </div>
        <p>This is your last chance to place a bid!</p>
        <a href="{{auction_link}}" style="background: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Bid Now</a>
      `
    }
  },
  {
    id: 'welcome_email',
    name: 'Welcome Email',
    description: 'Sent to new users after registration',
    trigger: 'user_registered',
    isEnabled: true,
    emailsSent: 45,
    lastSent: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    template: {
      subject: 'Welcome to Live Bid Dash! 🎉',
      content: `
        <h2>Welcome to Live Bid Dash!</h2>
        <p>Thank you for joining our exciting auction community, <strong>{{user_name}}</strong>!</p>
        <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Get Started:</h3>
          <ul>
            <li>Browse our current auctions</li>
            <li>Set up your bidding preferences</li>
            <li>Complete your profile for better experience</li>
            <li>Follow your favorite sellers</li>
          </ul>
        </div>
        <p>Happy bidding!</p>
        <a href="{{browse_auctions_link}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Browse Auctions</a>
      `
    }
  }
];

export function AutomatedEmailSystem({ className }: AutomatedEmailSystemProps) {
  const [automations, setAutomations] = useState<EmailAutomation[]>(EMAIL_AUTOMATIONS);
  const [emailStats, setEmailStats] = useState<EmailStats>({
    totalSent: 535,
    deliveryRate: 98.2,
    openRate: 45.7,
    clickRate: 12.3
  });
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const toggleAutomation = async (id: string, enabled: boolean) => {
    setLoading(true);

    try {
      // In a real implementation, this would update the database
      setAutomations(prev => prev.map(automation => 
        automation.id === id 
          ? { ...automation, isEnabled: enabled }
          : automation
      ));

      toast({
        title: enabled ? "Automation Enabled" : "Automation Disabled",
        description: `Email automation has been ${enabled ? 'enabled' : 'disabled'}.`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update automation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (automationId: string) => {
    setLoading(true);

    try {
      const automation = automations.find(a => a.id === automationId);
      if (!automation) throw new Error('Automation not found');

      // Simulate sending test email
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Test Email Sent",
        description: `Test email for "${automation.name}" has been sent to your email.`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isEnabled: boolean) => {
    return isEnabled ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="outline">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Disabled
      </Badge>
    );
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{formatNumber(emailStats.totalSent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(emailStats.deliveryRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(emailStats.openRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(emailStats.clickRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email Automations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Email Automations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="border border-border rounded-lg p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{automation.name}</h3>
                    {getStatusBadge(automation.isEnabled)}
                  </div>
                  <p className="text-muted-foreground">{automation.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-${automation.id}`} className="text-sm">
                    {automation.isEnabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id={`toggle-${automation.id}`}
                    checked={automation.isEnabled}
                    onCheckedChange={(checked) => toggleAutomation(automation.id, checked)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                  <p className="text-xl font-bold">{formatNumber(automation.emailsSent)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Trigger</p>
                  <p className="text-sm font-medium">{automation.trigger}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Last Sent</p>
                  <p className="text-sm font-medium">
                    {automation.lastSent 
                      ? new Date(automation.lastSent).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {/* Template Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Email Template</span>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Subject:</strong> {automation.template.subject}
                </p>
                <div className="text-xs text-blue-600 bg-white rounded p-2 max-h-20 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ 
                    __html: automation.template.content.substring(0, 200) + '...'
                  }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTestEmail(automation.id)}
                  disabled={loading || !automation.isEnabled}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Template
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Recent Email Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: 'Auction Won Confirmation', recipient: 'john.doe@email.com', time: '2 minutes ago', status: 'delivered' },
              { type: 'Outbid Alert', recipient: 'jane.smith@email.com', time: '15 minutes ago', status: 'opened' },
              { type: 'Payment Reminder', recipient: 'mike.wilson@email.com', time: '1 hour ago', status: 'clicked' },
              { type: 'Shipping Confirmation', recipient: 'sarah.jones@email.com', time: '2 hours ago', status: 'delivered' },
              { type: 'Welcome Email', recipient: 'new.user@email.com', time: '3 hours ago', status: 'delivered' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{activity.type}</p>
                  <p className="text-sm text-muted-foreground">{activity.recipient}</p>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={activity.status === 'clicked' ? 'default' : 'outline'}
                    className={
                      activity.status === 'delivered' ? 'bg-blue-500' :
                      activity.status === 'opened' ? 'bg-yellow-500' :
                      activity.status === 'clicked' ? 'bg-green-500' : ''
                    }
                  >
                    {activity.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
