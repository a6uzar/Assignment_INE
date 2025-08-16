import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Shield,
  Users,
  Gavel,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Ban,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Calendar,
  Star,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type User = Database['public']['Tables']['users']['Row'];
type Auction = Database['public']['Tables']['auctions']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

interface AdminStats {
  totalUsers: number;
  activeAuctions: number;
  totalRevenue: number;
  completedSales: number;
  userGrowth: number;
  auctionGrowth: number;
  revenueGrowth: number;
}

interface ChartData {
  month: string;
  users: number;
  auctions: number;
  revenue: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff88'];

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeAuctions: 0,
    totalRevenue: 0,
    completedSales: 0,
    userGrowth: 0,
    auctionGrowth: 0,
    revenueGrowth: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user is admin
  const isAdmin = user?.is_admin;

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchAuctions(),
        fetchTransactions(),
        fetchChartData(),
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    const { data: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const { data: auctionCount } = await supabase
      .from('auctions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    const { data: salesCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    setStats({
      totalUsers: userCount?.count || 0,
      activeAuctions: auctionCount?.count || 0,
      totalRevenue,
      completedSales: salesCount?.count || 0,
      userGrowth: 12.5, // Mock data - would calculate from historical data
      auctionGrowth: 8.3,
      revenueGrowth: 15.7,
    });
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const fetchAuctions = async () => {
    const { data, error } = await supabase
      .from('auctions')
      .select(`
        *,
        users!auctions_seller_id_fkey(full_name),
        categories(name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching auctions:', error);
    } else {
      setAuctions(data || []);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        auctions(title),
        users!transactions_seller_id_fkey(full_name),
        buyer:users!transactions_buyer_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
  };

  const fetchChartData = async () => {
    // Mock chart data - in real app, would aggregate from database
    const mockData: ChartData[] = [
      { month: 'Jan', users: 65, auctions: 28, revenue: 12500 },
      { month: 'Feb', users: 89, auctions: 42, revenue: 18700 },
      { month: 'Mar', users: 127, auctions: 56, revenue: 24300 },
      { month: 'Apr', users: 158, auctions: 73, revenue: 31800 },
      { month: 'May', users: 203, auctions: 91, revenue: 42100 },
      { month: 'Jun', users: 241, auctions: 108, revenue: 48600 },
    ];
    setChartData(mockData);
  };

  const handleUserAction = async (userId: string, action: 'verify' | 'ban' | 'delete') => {
    try {
      if (action === 'verify') {
        const { error } = await supabase
          .from('users')
          .update({ is_verified: true })
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: "User Verified",
          description: "User has been successfully verified",
        });
      } else if (action === 'ban') {
        const { error } = await supabase
          .from('users')
          .update({ is_verified: false })
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: "User Banned",
          description: "User has been banned",
        });
      } else if (action === 'delete') {
        // In production, you might want to soft delete instead
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;

        toast({
          title: "User Deleted",
          description: "User has been deleted",
        });
      }

      fetchUsers(); // Refresh the list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to perform action";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleAuctionAction = async (auctionId: string, action: 'approve' | 'reject' | 'feature') => {
    try {
      if (action === 'approve') {
        const { error } = await supabase
          .from('auctions')
          .update({ status: 'active' })
          .eq('id', auctionId);

        if (error) throw error;

        toast({
          title: "Auction Approved",
          description: "Auction has been approved and is now active",
        });
      } else if (action === 'reject') {
        const { error } = await supabase
          .from('auctions')
          .update({ status: 'cancelled' })
          .eq('id', auctionId);

        if (error) throw error;

        toast({
          title: "Auction Rejected",
          description: "Auction has been rejected",
        });
      } else if (action === 'feature') {
        const { error } = await supabase
          .from('auctions')
          .update({ featured: true })
          .eq('id', auctionId);

        if (error) throw error;

        toast({
          title: "Auction Featured",
          description: "Auction has been featured",
        });
      }

      fetchAuctions(); // Refresh the list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to perform action";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      draft: "secondary",
      ended: "outline",
      cancelled: "destructive",
      completed: "default",
    };

    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'verified' && user.is_verified) ||
                         (filterStatus === 'unverified' && !user.is_verified);
    return matchesSearch && matchesFilter;
  });

  if (!isAdmin) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-600">
            You don't have permission to access the admin dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, auctions, and platform analytics</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{stats.userGrowth}%
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Auctions</p>
                <p className="text-2xl font-bold">{stats.activeAuctions.toLocaleString()}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{stats.auctionGrowth}%
                </div>
              </div>
              <Gavel className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +{stats.revenueGrowth}%
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Sales</p>
                <p className="text-2xl font-bold">{stats.completedSales.toLocaleString()}</p>
                <div className="flex items-center text-sm text-green-600 mt-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Active
                </div>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
            <CardDescription>User and auction growth over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="auctions" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Monthly revenue performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="auctions">Auctions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts and permissions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Users</option>
                    <option value="verified">Verified</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {user.full_name.charAt(0)}
                          </div>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_verified ? "default" : "secondary"}>
                          {user.is_verified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {!user.is_verified && (
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'verify')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Verify User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, 'ban')}>
                              <Ban className="h-4 w-4 mr-2" />
                              Ban User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleUserAction(user.id, 'delete')}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auctions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auction Management</CardTitle>
              <CardDescription>Monitor and manage all auctions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auctions.map((auction) => (
                    <TableRow key={auction.id}>
                      <TableCell className="font-medium">{auction.title}</TableCell>
                      <TableCell>{auction.users?.full_name}</TableCell>
                      <TableCell>{getStatusBadge(auction.status)}</TableCell>
                      <TableCell>${auction.current_price.toLocaleString()}</TableCell>
                      <TableCell>
                        {new Date(auction.end_time).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Auction
                            </DropdownMenuItem>
                            {auction.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleAuctionAction(auction.id, 'approve')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleAuctionAction(auction.id, 'feature')}>
                              <Star className="h-4 w-4 mr-2" />
                              Feature
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAuctionAction(auction.id, 'reject')}
                              className="text-red-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View all platform transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Auction</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {transaction.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{transaction.auctions?.title}</TableCell>
                      <TableCell>{transaction.users?.full_name}</TableCell>
                      <TableCell>{transaction.buyer?.full_name}</TableCell>
                      <TableCell>${transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
