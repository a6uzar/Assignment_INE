import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DebugResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

interface AuctionTest {
  id: string;
  title: string;
  current_price: number;
  end_time: string;
  status: string;
}

export default function SystemDebug() {
  const [results, setResults] = useState<DebugResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [auctions, setAuctions] = useState<AuctionTest[]>([]);
  const [testBidAmount, setTestBidAmount] = useState('');
  const [selectedAuctionId, setSelectedAuctionId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  
  const { user } = useAuth();

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test 1: Database Connection
  const testDatabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('auctions').select('count').limit(1);
      
      if (error) {
        addResult({
          test: 'Database Connection',
          status: 'error',
          message: `Connection failed: ${error.message}`,
          details: error
        });
      } else {
        addResult({
          test: 'Database Connection',
          status: 'success',
          message: 'Successfully connected to Supabase database',
          details: data
        });
      }
    } catch (error) {
      addResult({
        test: 'Database Connection',
        status: 'error',
        message: `Unexpected error: ${error}`,
        details: error
      });
    }
  };

  // Test 2: Authentication State
  const testAuthentication = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addResult({
          test: 'Authentication',
          status: 'error',
          message: `Auth error: ${error.message}`,
          details: error
        });
      } else if (session && session.user) {
        addResult({
          test: 'Authentication',
          status: 'success',
          message: `User authenticated: ${session.user.email}`,
          details: {
            userId: session.user.id,
            email: session.user.email,
            role: session.user.role
          }
        });
      } else {
        addResult({
          test: 'Authentication',
          status: 'warning',
          message: 'No active user session - please login',
          details: null
        });
      }
    } catch (error) {
      addResult({
        test: 'Authentication',
        status: 'error',
        message: `Auth check failed: ${error}`,
        details: error
      });
    }
  };

  // Test 3: Table Access
  const testTableAccess = async () => {
    const tables = ['auctions', 'bids', 'auction_chat', 'users', 'notifications'] as const;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          addResult({
            test: `Table Access - ${table}`,
            status: 'error',
            message: `Cannot access ${table}: ${error.message}`,
            details: error
          });
        } else {
          addResult({
            test: `Table Access - ${table}`,
            status: 'success',
            message: `Successfully accessed ${table} table`,
            details: { recordCount: data?.length || 0 }
          });
        }
      } catch (error) {
        addResult({
          test: `Table Access - ${table}`,
          status: 'error',
          message: `Failed to query ${table}: ${error}`,
          details: error
        });
      }
    }
  };

  // Test 4: Real-time Subscriptions
  const testRealtimeSubscriptions = async () => {
    try {
      const channel = supabase
        .channel('debug-test')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'auctions' },
          (payload) => {
            console.log('Real-time test received:', payload);
            addResult({
              test: 'Real-time Subscriptions',
              status: 'success',
              message: 'Real-time subscription working',
              details: payload
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            addResult({
              test: 'Real-time Subscriptions',
              status: 'success',
              message: 'Successfully subscribed to real-time updates',
              details: { channel: 'debug-test', status }
            });
          } else if (status === 'CHANNEL_ERROR') {
            addResult({
              test: 'Real-time Subscriptions',
              status: 'error',
              message: 'Failed to subscribe to real-time updates',
              details: { status }
            });
          }
        });

      // Clean up after 5 seconds
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 5000);

    } catch (error) {
      addResult({
        test: 'Real-time Subscriptions',
        status: 'error',
        message: `Real-time test failed: ${error}`,
        details: error
      });
    }
  };

  // Test 5: Load Sample Auctions
  const loadSampleAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select('id, title, current_price, end_time, status')
        .limit(10)
        .order('created_at', { ascending: false });

      if (error) {
        addResult({
          test: 'Load Sample Auctions',
          status: 'error',
          message: `Failed to load auctions: ${error.message}`,
          details: error
        });
      } else {
        setAuctions(data || []);
        addResult({
          test: 'Load Sample Auctions',
          status: 'success',
          message: `Loaded ${data?.length || 0} auctions`,
          details: data
        });
      }
    } catch (error) {
      addResult({
        test: 'Load Sample Auctions',
        status: 'error',
        message: `Auction loading failed: ${error}`,
        details: error
      });
    }
  };

  // Test 6: Create Sample Data
  const createSampleData = async () => {
    if (!user) {
      addResult({
        test: 'Create Sample Data',
        status: 'error',
        message: 'User must be logged in to create sample data',
        details: null
      });
      return;
    }

    try {
      // Create a test auction
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + 24); // 24 hours from now

      const startTime = new Date();

      const { data: auction, error: auctionError } = await supabase
        .from('auctions')
        .insert({
          title: `Test Auction ${Date.now()}`,
          description: 'This is a test auction created by the debug tool',
          starting_price: 10.00,
          current_price: 10.00,
          end_time: endTime.toISOString(),
          start_time: startTime.toISOString(),
          status: 'active' as const,
          seller_id: user.id,
          images: ['/placeholder.svg']
        })
        .select()
        .single();

      if (auctionError) {
        addResult({
          test: 'Create Sample Data',
          status: 'error',
          message: `Failed to create auction: ${auctionError.message}`,
          details: auctionError
        });
        return;
      }

      addResult({
        test: 'Create Sample Data',
        status: 'success',
        message: `Created test auction: ${auction.title}`,
        details: auction
      });

      // Refresh auctions list
      await loadSampleAuctions();

    } catch (error) {
      addResult({
        test: 'Create Sample Data',
        status: 'error',
        message: `Sample data creation failed: ${error}`,
        details: error
      });
    }
  };

  // Test 7: Place Test Bid
  const placeTestBid = async () => {
    if (!user) {
      addResult({
        test: 'Place Test Bid',
        status: 'error',
        message: 'User must be logged in to place bids',
        details: null
      });
      return;
    }

    if (!selectedAuctionId || !testBidAmount) {
      addResult({
        test: 'Place Test Bid',
        status: 'error',
        message: 'Please select an auction and enter bid amount',
        details: null
      });
      return;
    }

    try {
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .insert({
          auction_id: selectedAuctionId,
          bidder_id: user.id,
          amount: parseFloat(testBidAmount),
          status: 'active'
        })
        .select()
        .single();

      if (bidError) {
        addResult({
          test: 'Place Test Bid',
          status: 'error',
          message: `Failed to place bid: ${bidError.message}`,
          details: bidError
        });
      } else {
        addResult({
          test: 'Place Test Bid',
          status: 'success',
          message: `Successfully placed bid of $${testBidAmount}`,
          details: bid
        });

        // Update auction current price
        await supabase
          .from('auctions')
          .update({ current_price: parseFloat(testBidAmount) })
          .eq('id', selectedAuctionId);
      }
    } catch (error) {
      addResult({
        test: 'Place Test Bid',
        status: 'error',
        message: `Bid placement failed: ${error}`,
        details: error
      });
    }
  };

  // Test 8: Send Test Message
  const sendTestMessage = async () => {
    if (!user) {
      addResult({
        test: 'Send Test Message',
        status: 'error',
        message: 'User must be logged in to send messages',
        details: null
      });
      return;
    }

    if (!selectedAuctionId || !testMessage) {
      addResult({
        test: 'Send Test Message',
        status: 'error',
        message: 'Please select an auction and enter a message',
        details: null
      });
      return;
    }

    try {
      const { data: message, error: messageError } = await supabase
        .from('auction_chat')
        .insert({
          auction_id: selectedAuctionId,
          user_id: user.id,
          message: testMessage,
          message_type: 'text'
        })
        .select()
        .single();

      if (messageError) {
        addResult({
          test: 'Send Test Message',
          status: 'error',
          message: `Failed to send message: ${messageError.message}`,
          details: messageError
        });
      } else {
        addResult({
          test: 'Send Test Message',
          status: 'success',
          message: `Successfully sent message: "${testMessage}"`,
          details: message
        });
        setTestMessage(''); // Clear message input
      }
    } catch (error) {
      addResult({
        test: 'Send Test Message',
        status: 'error',
        message: `Message sending failed: ${error}`,
        details: error
      });
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setLoading(true);
    clearResults();
    
    await testDatabaseConnection();
    await testAuthentication();
    await testTableAccess();
    await testRealtimeSubscriptions();
    await loadSampleAuctions();
    
    setLoading(false);
  };

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🔧 System Debug & Testing Dashboard</h1>
      
      <Tabs defaultValue="system" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="data">Sample Data</TabsTrigger>
          <TabsTrigger value="bidding">Bidding Tests</TabsTrigger>
          <TabsTrigger value="social">Social Features</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Checks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={runAllTests} disabled={loading}>
                  {loading ? 'Running Tests...' : 'Run All Tests'}
                </Button>
                <Button onClick={testDatabaseConnection} variant="outline">Database</Button>
                <Button onClick={testAuthentication} variant="outline">Auth</Button>
                <Button onClick={testTableAccess} variant="outline">Tables</Button>
                <Button onClick={testRealtimeSubscriptions} variant="outline">Real-time</Button>
                <Button onClick={clearResults} variant="destructive">Clear Results</Button>
              </div>

              <div className="space-y-2">
                {results.map((result, index) => (
                  <Alert key={index} className="border-l-4" style={{borderLeftColor: result.status === 'success' ? '#10b981' : result.status === 'error' ? '#ef4444' : '#f59e0b'}}>
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status.toUpperCase()}
                          </Badge>
                          <span className="ml-2 font-semibold">{result.test}</span>
                        </div>
                      </div>
                      <p className="mt-1">{result.message}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-gray-600">View Details</summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={loadSampleAuctions}>Load Auctions</Button>
                <Button onClick={createSampleData}>Create Test Auction</Button>
              </div>

              {auctions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Available Auctions:</h3>
                  <div className="space-y-2">
                    {auctions.map((auction) => (
                      <div key={auction.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <span className="font-medium">{auction.title}</span>
                          <Badge className="ml-2">{auction.status}</Badge>
                          <span className="ml-2 text-sm text-gray-600">
                            Current: ${auction.current_price}
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedAuctionId(auction.id)}
                          variant={selectedAuctionId === auction.id ? "default" : "outline"}
                        >
                          {selectedAuctionId === auction.id ? "Selected" : "Select"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bidding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bidding System Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && (
                <Alert>
                  <AlertDescription>
                    Please login to test bidding functionality. Go to <a href="/auth" className="underline">Authentication</a> page.
                  </AlertDescription>
                </Alert>
              )}

              {selectedAuctionId && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bid-amount">Bid Amount ($)</Label>
                    <Input
                      id="bid-amount"
                      type="number"
                      step="0.01"
                      value={testBidAmount}
                      onChange={(e) => setTestBidAmount(e.target.value)}
                      placeholder="Enter bid amount"
                    />
                  </div>
                  <Button onClick={placeTestBid} disabled={!user || !testBidAmount}>
                    Place Test Bid
                  </Button>
                </div>
              )}

              {!selectedAuctionId && (
                <p className="text-gray-600">Please select an auction from the Sample Data tab first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Features Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user && (
                <Alert>
                  <AlertDescription>
                    Please login to test social features. Go to <a href="/auth" className="underline">Authentication</a> page.
                  </AlertDescription>
                </Alert>
              )}

              {selectedAuctionId && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test-message">Test Chat Message</Label>
                    <Textarea
                      id="test-message"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Enter a test message..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={sendTestMessage} disabled={!user || !testMessage}>
                    Send Test Message
                  </Button>
                </div>
              )}

              {!selectedAuctionId && (
                <p className="text-gray-600">Please select an auction from the Sample Data tab first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
