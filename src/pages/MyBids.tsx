import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gavel, TrendingUp, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  is_auto_bid: boolean;
  auction: {
    id: string;
    title: string;
    current_price: number;
    end_time: string;
    status: string;
    images?: string[];
  };
}

const MyBids = () => {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBids: 0,
    activeBids: 0,
    wonAuctions: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (user) {
      fetchMyBids();
    }
  }, [user]);

  const fetchMyBids = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          id,
          amount,
          created_at,
          is_auto_bid,
          auction:auctions (
            id,
            title,
            current_price,
            end_time,
            status,
            images,
            winner_id
          )
        `)
        .eq('bidder_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bids:', error);
        return;
      }

      const bidData = data || [];
      setBids(bidData);

      // Calculate stats
      const activeBids = bidData.filter(bid => 
        bid.auction?.status === 'active'
      ).length;
      
      const wonAuctions = bidData.filter(bid => 
        bid.auction?.winner_id === user.id
      ).length;

      const totalSpent = bidData
        .filter(bid => bid.auction?.winner_id === user.id)
        .reduce((sum, bid) => sum + bid.amount, 0);

      setStats({
        totalBids: bidData.length,
        activeBids,
        wonAuctions,
        totalSpent,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isWinning = (bid: Bid) => {
    return bid.amount === bid.auction?.current_price && bid.auction?.status === 'active';
  };

  const hasWon = (bid: Bid) => {
    return (bid.auction as any)?.winner_id === user?.id;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Please Sign In</h3>
            <p className="text-muted-foreground mb-4">You need to be logged in to view your bids.</p>
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const activeBids = bids.filter(bid => bid.auction?.status === 'active');
  const completedBids = bids.filter(bid => ['ended', 'completed'].includes(bid.auction?.status || ''));
  const wonBids = bids.filter(bid => hasWon(bid));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Bids</h1>
        <p className="text-muted-foreground">Track your bidding activity and results</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Gavel className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalBids}</div>
            <div className="text-sm text-muted-foreground">Total Bids</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.activeBids}</div>
            <div className="text-sm text-muted-foreground">Active Bids</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.wonAuctions}</div>
            <div className="text-sm text-muted-foreground">Won Auctions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">${stats.totalSpent.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Spent</div>
          </CardContent>
        </Card>
      </div>

      {bids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bids Yet</h3>
            <p className="text-muted-foreground mb-4">Start bidding on auctions to see your activity here.</p>
            <Button asChild>
              <Link to="/auctions">Browse Auctions</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All Bids ({bids.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeBids.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedBids.length})</TabsTrigger>
            <TabsTrigger value="won">Won ({wonBids.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {bids.map((bid) => (
                <Card key={bid.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                          {bid.auction?.images?.[0] ? (
                            <img 
                              src={bid.auction.images[0]} 
                              alt={bid.auction.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Gavel className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{bid.auction?.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(bid.auction?.status || '')}>
                              {bid.auction?.status}
                            </Badge>
                            {isWinning(bid) && (
                              <Badge variant="default" className="bg-green-600">
                                Winning
                              </Badge>
                            )}
                            {hasWon(bid) && (
                              <Badge variant="default" className="bg-purple-600">
                                Won
                              </Badge>
                            )}
                            {bid.is_auto_bid && (
                              <Badge variant="secondary">Auto Bid</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Bid placed {formatDistanceToNow(new Date(bid.created_at))} ago
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${bid.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: ${bid.auction?.current_price?.toLocaleString() || 0}
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-2">
                          <Link to={`/auction/${bid.auction?.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Auction
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="mt-6">
            <div className="space-y-4">
              {activeBids.map((bid) => (
                <Card key={bid.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                          {bid.auction?.images?.[0] ? (
                            <img 
                              src={bid.auction.images[0]} 
                              alt={bid.auction.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Gavel className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{bid.auction?.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {isWinning(bid) && (
                              <Badge variant="default" className="bg-green-600">
                                Winning
                              </Badge>
                            )}
                            {bid.is_auto_bid && (
                              <Badge variant="secondary">Auto Bid</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${bid.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: ${bid.auction?.current_price?.toLocaleString() || 0}
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-2">
                          <Link to={`/auction/${bid.auction?.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Auction
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
              {completedBids.map((bid) => (
                <Card key={bid.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                          {bid.auction?.images?.[0] ? (
                            <img 
                              src={bid.auction.images[0]} 
                              alt={bid.auction.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Gavel className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{bid.auction?.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(bid.auction?.status || '')}>
                              {bid.auction?.status}
                            </Badge>
                            {hasWon(bid) && (
                              <Badge variant="default" className="bg-purple-600">
                                Won
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${bid.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Final: ${bid.auction?.current_price?.toLocaleString() || 0}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="won" className="mt-6">
            <div className="space-y-4">
              {wonBids.map((bid) => (
                <Card key={bid.id} className="hover:shadow-md transition-shadow border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                          {bid.auction?.images?.[0] ? (
                            <img 
                              src={bid.auction.images[0]} 
                              alt={bid.auction.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Gavel className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{bid.auction?.title}</h3>
                          <Badge variant="default" className="bg-purple-600 mt-1">
                            🎉 Won Auction
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600">${bid.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Winning Bid</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MyBids;
