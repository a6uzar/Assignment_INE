import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Mail,
  Send,
  Users,
  Filter,
  Target,
  Calendar,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  RefreshCw,
  FileText,
  DollarSign,
  User,
  Gavel,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'auction_won' | 'outbid' | 'auction_ended' | 'payment_reminder' | 'custom';
}

interface EmailCampaign {
  id: string;
  name: string;
  template: string;
  recipients: string[];
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_at?: string;
  sent_at?: string;
  open_rate: number;
  click_rate: number;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    name: 'Auction Won',
    subject: 'Congratulations! You won the auction for {{auction_title}}',
    content: `
      <h2>Congratulations!</h2>
      <p>You have successfully won the auction for <strong>{{auction_title}}</strong>.</p>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Auction Details:</h3>
        <p><strong>Winning Bid:</strong> ${'{{winning_amount}}'}</p>
        <p><strong>Seller:</strong> {'{{seller_name}}'}</p>
        <p><strong>Auction End:</strong> {'{{end_date}}'}</p>
      </div>
      <p>Please proceed with payment within 48 hours to complete the transaction.</p>
      <a href="{{payment_link}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Payment</a>
    `,
    type: 'auction_won',
  },
  {
    id: '2',
    name: 'Outbid Notification',
    subject: 'You have been outbid on {{auction_title}}',
    content: `
      <h2>You've been outbid!</h2>
      <p>Someone has placed a higher bid on <strong>{{auction_title}}</strong>.</p>
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Current Status:</h3>
        <p><strong>Current Highest Bid:</strong> ${'{{current_bid}}'}</p>
        <p><strong>Your Bid:</strong> ${'{{your_bid}}'}</p>
        <p><strong>Time Remaining:</strong> {'{{time_remaining}}'}</p>
      </div>
      <p>Don't miss out! Place a higher bid to stay in the running.</p>
      <a href="{{auction_link}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Place New Bid</a>
    `,
    type: 'outbid',
  },
  {
    id: '3',
    name: 'Payment Reminder',
    subject: 'Payment reminder for {{auction_title}}',
    content: `
      <h2>Payment Reminder</h2>
      <p>This is a friendly reminder that payment is due for your winning bid on <strong>{{auction_title}}</strong>.</p>
      <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details:</h3>
        <p><strong>Amount Due:</strong> ${'{{amount_due}}'}</p>
        <p><strong>Due Date:</strong> {'{{due_date}}'}</p>
        <p><strong>Days Remaining:</strong> {'{{days_remaining}}'}</p>
      </div>
      <p>Please complete your payment to avoid cancellation of the sale.</p>
      <a href="{{payment_link}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Pay Now</a>
    `,
    type: 'payment_reminder',
  },
];

export function EmailNotificationSystem() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'analytics'>('campaigns');
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template: '',
    recipients: [] as string[],
    scheduled_at: '',
  });
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.template) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCampaign(true);

    try {
      // In production, this would create the campaign in the database
      const campaign: EmailCampaign = {
        id: Date.now().toString(),
        name: newCampaign.name,
        template: newCampaign.template,
        recipients: newCampaign.recipients,
        status: newCampaign.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: newCampaign.scheduled_at || undefined,
        open_rate: 0,
        click_rate: 0,
      };

      setCampaigns(prev => [...prev, campaign]);

      toast({
        title: "Campaign Created",
        description: `Email campaign "${newCampaign.name}" has been created successfully.`,
      });

      // Reset form
      setNewCampaign({
        name: '',
        template: '',
        recipients: [],
        scheduled_at: '',
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      // In production, this would trigger the email sending service
      setCampaigns(prev => prev.map(c => 
        c.id === campaignId 
          ? { ...c, status: 'sent', sent_at: new Date().toISOString() }
          : c
      ));

      toast({
        title: "Campaign Sent",
        description: "Email campaign has been sent successfully.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send campaign",
        variant: "destructive",
      });
    }
  };

  const generateInvoicePDF = async (transactionData: any) => {
    try {
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('INVOICE', 20, 20);
      
      pdf.setFontSize(12);
      pdf.text('Live Bid Dash Auction Platform', 20, 30);
      pdf.text('Invoice Date: ' + new Date().toLocaleDateString(), 20, 40);
      pdf.text('Invoice #: ' + transactionData.id, 20, 50);
      
      // Billing Information
      pdf.setFontSize(14);
      pdf.text('Bill To:', 20, 70);
      pdf.setFontSize(12);
      pdf.text(transactionData.buyer_name, 20, 80);
      pdf.text(transactionData.buyer_email, 20, 90);
      
      // Auction Details
      pdf.setFontSize(14);
      pdf.text('Auction Details:', 20, 110);
      pdf.setFontSize(12);
      pdf.text('Item: ' + transactionData.auction_title, 20, 120);
      pdf.text('Seller: ' + transactionData.seller_name, 20, 130);
      pdf.text('Winning Bid: $' + transactionData.amount.toLocaleString(), 20, 140);
      
      // Total
      pdf.setFontSize(14);
      pdf.text('Total Amount: $' + transactionData.total_amount.toLocaleString(), 20, 160);
      
      // Save PDF
      pdf.save(`invoice-${transactionData.id}.pdf`);
      
      toast({
        title: "Invoice Generated",
        description: "PDF invoice has been downloaded successfully.",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF invoice",
        variant: "destructive",
      });
    }
  };

  const previewTemplate = (template: EmailTemplate) => {
    const mockData = {
      auction_title: "Vintage Rolex Watch",
      winning_amount: "2,500",
      seller_name: "John Smith",
      end_date: "Dec 15, 2024",
      current_bid: "2,600",
      your_bid: "2,400",
      time_remaining: "2 hours 30 minutes",
      amount_due: "2,500",
      due_date: "Dec 20, 2024",
      days_remaining: "3",
    };

    let content = template.content;
    Object.entries(mockData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return content;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email & Notifications</h1>
          <p className="text-gray-600">Manage email campaigns and automated notifications</p>
        </div>
        <Button onClick={() => setIsCreatingCampaign(true)}>
          <Mail className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {['campaigns', 'templates', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>Create and manage email campaigns for your auctions</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No email campaigns yet. Create your first campaign to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{campaign.name}</h3>
                          <Badge
                            variant={
                              campaign.status === 'sent' ? 'default' :
                              campaign.status === 'scheduled' ? 'secondary' : 'outline'
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {campaign.recipients.length} recipients
                          {campaign.sent_at && ` • Sent ${new Date(campaign.sent_at).toLocaleDateString()}`}
                          {campaign.scheduled_at && ` • Scheduled for ${new Date(campaign.scheduled_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleSendCampaign(campaign.id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EMAIL_TEMPLATES.map((template) => (
            <Card key={template.id} className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Badge variant="outline">{template.type}</Badge>
                  <div className="text-sm text-gray-600">
                    <div
                      className="p-3 bg-gray-50 rounded text-xs overflow-hidden"
                      style={{ maxHeight: '120px' }}
                    >
                      {template.content.substring(0, 200)}...
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{template.name}</DialogTitle>
                          <DialogDescription>Email template preview</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Subject Line</Label>
                            <Input value={template.subject} readOnly />
                          </div>
                          <div>
                            <Label>Email Content</Label>
                            <div
                              className="border rounded p-4 bg-white"
                              dangerouslySetInnerHTML={{ __html: previewTemplate(template) }}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" className="flex-1">
                      Use Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails Sent</p>
                  <p className="text-2xl font-bold">1,234</p>
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    +12.5%
                  </div>
                </div>
                <Send className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Rate</p>
                  <p className="text-2xl font-bold">68.2%</p>
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <Eye className="h-4 w-4 mr-1" />
                    +3.1%
                  </div>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Click Rate</p>
                  <p className="text-2xl font-bold">24.7%</p>
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <Target className="h-4 w-4 mr-1" />
                    +1.8%
                  </div>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold">12.3%</p>
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <Zap className="h-4 w-4 mr-1" />
                    +2.4%
                  </div>
                </div>
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={isCreatingCampaign} onOpenChange={setIsCreatingCampaign}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Set up a new email campaign for your auction platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name"
              />
            </div>

            <div>
              <Label>Email Template</Label>
              <Select
                value={newCampaign.template}
                onValueChange={(value) => setNewCampaign(prev => ({ ...prev, template: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Recipients</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">All Users</SelectItem>
                  <SelectItem value="active_bidders">Active Bidders</SelectItem>
                  <SelectItem value="sellers">Sellers</SelectItem>
                  <SelectItem value="winners">Auction Winners</SelectItem>
                  <SelectItem value="custom">Custom List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Schedule (Optional)</Label>
              <Input
                type="datetime-local"
                value={newCampaign.scheduled_at}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, scheduled_at: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreatingCampaign(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                <Send className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Invoice Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Generator
          </CardTitle>
          <CardDescription>Generate PDF invoices for completed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input placeholder="Enter transaction ID" className="flex-1" />
            <Button
              onClick={() => generateInvoicePDF({
                id: 'TXN001',
                buyer_name: 'John Doe',
                buyer_email: 'john@example.com',
                auction_title: 'Vintage Rolex Watch',
                seller_name: 'Jane Smith',
                amount: 2500,
                total_amount: 2500,
              })}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
