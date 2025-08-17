// Debug tool to test all major functionalities
// Add this component to check if systems are working

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeBidding } from '@/hooks/useRealtimeBidding';
import { seedDatabase } from '@/lib/seedData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SystemCheck {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
  details?: any;
}

export function SystemDebugger() {
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [testAuctionId, setTestAuctionId] = useState('');
  const [testBidAmount, setTestBidAmount] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const { user } = useAuth();

  const updateCheck = (name: string, status: SystemCheck['status'], message: string, details?: any) => {
    setChecks(prev => prev.map(check => 
      check.name === name 
        ? { ...check, status, message, details }
        : check
    ));
  };

  const runSystemChecks = async () => {
    const initialChecks: SystemCheck[] = [
      { name: 'Supabase Connection', status: 'checking', message: 'Testing connection...' },
      { name: 'Authentication', status: 'checking', message: 'Checking user auth...' },
      { name: 'Database Tables', status: 'checking', message: 'Verifying table access...' },
      { name: 'Real-time Subscriptions', status: 'checking', message: 'Testing subscriptions...' },
    ];
    setChecks(initialChecks);

    // Test 1: Supabase Connection
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      updateCheck('Supabase Connection', 'success', 'Connected successfully');
    } catch (error) {
      updateCheck('Supabase Connection', 'error', `Connection failed: ${error.message}`);
    }

    // Test 2: Authentication
    if (user) {
      updateCheck('Authentication', 'success', `Logged in as: ${user.email}`, user);
    } else {
      updateCheck('Authentication', 'error', 'No user authenticated');
    }

    // Test 3: Database Tables
    const tables = ['auctions', 'bids', 'auction_chat', 'users'] as const;
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
        updateCheck(`${table} Table`, 'success', `Table accessible (${data?.length || 0} sample records)`);
      } catch (error) {
        updateCheck(`${table} Table`, 'error', `Table error: ${error.message}`);
      }
    }

    // Test 4: Real-time Subscriptions
    try {
      const channel = supabase.channel('test-channel');
      await new Promise((resolve, reject) => {
        channel
          .on('broadcast', { event: 'test' }, () => resolve(true))
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              updateCheck('Real-time Subscriptions', 'success', 'Subscriptions working');
              resolve(true);
            } else if (status === 'CLOSED') {
              reject(new Error('Subscription closed'));
            }
          });

        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Subscription timeout')), 5000);
      });
      
      supabase.removeChannel(channel);
    } catch (error) {
      updateCheck('Real-time Subscriptions', 'error', `Subscription error: ${error.message}`);
    }
  };

  const seedSampleData = async () => {
    try {
      const result = await seedDatabase();
      if (result.success) {
        alert('Sample data seeded successfully! Check console for details.');
        runSystemChecks(); // Refresh checks
      } else {
        alert('Seeding failed. Check console for errors.');
      }
    } catch (error) {
      console.error('Seeding error:', error);
      alert(`Seeding error: ${error.message}`);
    }
  };

  const testBidPlacement = async () => {
    if (!testAuctionId || !testBidAmount || !user) {
      alert('Please provide auction ID, bid amount, and ensure you are logged in');
      return;
    }

    try {
      console.log('Testing bid placement:', { auctionId: testAuctionId, amount: parseFloat(testBidAmount) });
      
      // Direct database test
      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', testAuctionId)
        .single();

      if (auctionError) {
        console.error('Auction fetch error:', auctionError);
        alert(`Auction not found: ${auctionError.message}`);
        return;
      }

      console.log('Auction found:', auction);

      const { data: newBid, error: bidError } = await supabase
        .from('bids')
        .insert({
          auction_id: testAuctionId,
          bidder_id: user.id,
          amount: parseFloat(testBidAmount),
          is_auto_bid: false,
          status: 'active',
        })
        .select('*')
        .single();

      if (bidError) {
        console.error('Bid placement error:', bidError);
        alert(`Bid failed: ${bidError.message}`);
        return;
      }

      console.log('Bid placed successfully:', newBid);
      alert('Bid placed successfully! Check console for details.');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  };

  const testMessageSending = async () => {
    if (!testAuctionId || !testMessage || !user) {
      alert('Please provide auction ID, message, and ensure you are logged in');
      return;
    }

    try {
      console.log('Testing message sending:', { auctionId: testAuctionId, message: testMessage });

      const { data: newMessage, error } = await supabase
        .from('auction_chat')
        .insert({
          auction_id: testAuctionId,
          user_id: user.id,
          message: testMessage,
          message_type: 'text',
          is_pinned: false
        })
        .select('*')
        .single();

      if (error) {
        console.error('Message sending error:', error);
        alert(`Message failed: ${error.message}`);
        return;
      }

      console.log('Message sent successfully:', newMessage);
      alert('Message sent successfully! Check console for details.');
    } catch (error) {
      console.error('Unexpected error:', error);
      alert(`Unexpected error: ${error.message}`);
    }
  };

  useEffect(() => {
    runSystemChecks();
  }, [user]);

  const getStatusColor = (status: SystemCheck['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔧 Live Auction System Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system">System Status</TabsTrigger>
            <TabsTrigger value="data">Sample Data</TabsTrigger>
            <TabsTrigger value="bidding">Test Bidding</TabsTrigger>
            <TabsTrigger value="messaging">Test Messaging</TabsTrigger>
          </TabsList>
          
          <TabsContent value="system" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">System Health Checks</h3>
              <Button onClick={runSystemChecks}>Refresh Checks</Button>
            </div>
            
            <div className="space-y-2">
              {checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{check.name}</span>
                    <p className={`text-sm ${getStatusColor(check.status)}`}>
                      {check.message}
                    </p>
                  </div>
                  <Badge variant={check.status === 'success' ? 'default' : check.status === 'error' ? 'destructive' : 'secondary'}>
                    {check.status}
                  </Badge>
                </div>
              ))}
            </div>

            {user && (
              <Alert>
                <AlertDescription>
                  <strong>Current User:</strong> {user.email} (ID: {user.id})
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <h3 className="text-lg font-semibold">Sample Data Management</h3>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  This will add sample auction data to test all functionalities. Includes active auctions, bids, and chat messages.
                </AlertDescription>
              </Alert>
              <Button onClick={seedSampleData} className="w-full">
                🌱 Seed Sample Data
              </Button>
              <div className="text-sm text-gray-600">
                <p><strong>Sample data includes:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>2 Active auctions with future end times</li>
                  <li>1 Ended auction for testing</li>
                  <li>Sample bids on each auction</li>
                  <li>Chat messages for real-time testing</li>
                  <li>Categories and user data</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bidding" className="space-y-4">
            <h3 className="text-lg font-semibold">Test Bid Placement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Auction ID</label>
                <Input 
                  value={testAuctionId} 
                  onChange={(e) => setTestAuctionId(e.target.value)}
                  placeholder="Enter auction ID to test with"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bid Amount</label>
                <Input 
                  type="number"
                  value={testBidAmount} 
                  onChange={(e) => setTestBidAmount(e.target.value)}
                  placeholder="Enter bid amount"
                />
              </div>
              <Button onClick={testBidPlacement} disabled={!user}>
                Test Bid Placement
              </Button>
              {!user && <p className="text-red-600 text-sm">Please log in to test bidding</p>}
            </div>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-4">
            <h3 className="text-lg font-semibold">Test Message Sending</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Auction ID</label>
                <Input 
                  value={testAuctionId} 
                  onChange={(e) => setTestAuctionId(e.target.value)}
                  placeholder="Enter auction ID to test with"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Test Message</label>
                <Input 
                  value={testMessage} 
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message"
                />
              </div>
              <Button onClick={testMessageSending} disabled={!user}>
                Test Message Sending
              </Button>
              {!user && <p className="text-red-600 text-sm">Please log in to test messaging</p>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
