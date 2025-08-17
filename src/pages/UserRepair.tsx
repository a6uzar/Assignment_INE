import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { repairCurrentUser, validateUserForBidding, UserRepairResult } from '@/lib/userRepair';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function UserRepairTool() {
  const [repairResult, setRepairResult] = useState<UserRepairResult | null>(null);
  const [validationResult, setValidationResult] = useState<UserRepairResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testBidLoading, setTestBidLoading] = useState(false);
  
  const { user } = useAuth();

  const handleRepairUser = async () => {
    setLoading(true);
    setRepairResult(null);
    
    try {
      const result = await repairCurrentUser();
      setRepairResult(result);
      
      if (result.success) {
        // Auto-validate after successful repair
        setTimeout(async () => {
          const validation = await validateUserForBidding();
          setValidationResult(validation);
        }, 1000);
      }
    } catch (error) {
      setRepairResult({
        success: false,
        message: `Repair failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateUser = async () => {
    setLoading(true);
    setValidationResult(null);
    
    try {
      const result = await validateUserForBidding();
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        success: false,
        message: `Validation failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestBid = async () => {
    if (!user) return;
    
    setTestBidLoading(true);
    
    try {
      // First validate user can bid
      const validation = await validateUserForBidding();
      if (!validation.success) {
        setValidationResult(validation);
        return;
      }

      // Try to get an active auction for testing
      const { data: auctions, error: auctionError } = await supabase
        .from('auctions')
        .select('id, title, current_price, status')
        .eq('status', 'active')
        .limit(1);

      if (auctionError || !auctions || auctions.length === 0) {
        setValidationResult({
          success: false,
          message: 'No active auctions found for testing. Please create an auction first.'
        });
        return;
      }

      const auction = auctions[0];
      const testAmount = auction.current_price + 1;

      // Attempt to place a test bid
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .insert({
          auction_id: auction.id,
          bidder_id: user.id,
          amount: testAmount,
          status: 'active'
        })
        .select()
        .single();

      if (bidError) {
        setValidationResult({
          success: false,
          message: `Test bid failed: ${bidError.message}`,
          details: bidError
        });
      } else {
        setValidationResult({
          success: true,
          message: `Test bid successful! Placed $${testAmount} bid on "${auction.title}"`,
          details: bid
        });

        // Clean up test bid after 2 seconds
        setTimeout(async () => {
          await supabase.from('bids').delete().eq('id', bid.id);
          console.log('Test bid cleaned up');
        }, 2000);
      }
    } catch (error) {
      setValidationResult({
        success: false,
        message: `Test bid error: ${error}`
      });
    } finally {
      setTestBidLoading(false);
    }
  };

  const getStatusBadge = (result: UserRepairResult) => {
    return (
      <Badge className={result.success ? 'bg-green-500' : 'bg-red-500'}>
        {result.success ? 'SUCCESS' : 'ERROR'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔧 User Repair Tool</h1>
      
      {/* Critical Issue Alert */}
      <Alert className="mb-6 border-l-4 border-red-500">
        <AlertDescription>
          <div className="font-semibold text-red-700 mb-2">🚨 CRITICAL ISSUE</div>
          <p className="text-red-600 mb-2">
            <strong>Error 23503:</strong> Foreign key constraint violation - User authenticated but missing from users table.
          </p>
          <p className="text-sm text-gray-700">
            This prevents bidding functionality. Use the repair tool below to fix this issue.
          </p>
        </AlertDescription>
      </Alert>

      {/* User Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current User Status</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-2">
              <p><strong>✅ Authenticated:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Full Name:</strong> {user.user_metadata?.full_name || 'Not set'}</p>
            </div>
          ) : (
            <div className="text-red-600">
              ❌ No user authenticated. Please <a href="/auth" className="underline">login</a> first.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repair Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Repair Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={handleRepairUser} 
              disabled={!user || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Repairing...' : '🔧 Repair User Profile'}
            </Button>
            
            <Button 
              onClick={handleValidateUser} 
              disabled={!user || loading}
              variant="outline"
            >
              ✅ Validate User
            </Button>
            
            <Button 
              onClick={handleTestBid} 
              disabled={!user || testBidLoading}
              variant="secondary"
            >
              {testBidLoading ? 'Testing...' : '🎯 Test Bid Placement'}
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-3">
            {repairResult && (
              <Alert className={`border-l-4 ${repairResult.success ? 'border-green-500' : 'border-red-500'}`}>
                <AlertDescription>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(repairResult)}
                    <span className="font-semibold">User Repair Result</span>
                  </div>
                  <p>{repairResult.message}</p>
                  {repairResult.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">View Details</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(repairResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {validationResult && (
              <Alert className={`border-l-4 ${validationResult.success ? 'border-green-500' : 'border-red-500'}`}>
                <AlertDescription>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(validationResult)}
                    <span className="font-semibold">Validation Result</span>
                  </div>
                  <p>{validationResult.message}</p>
                  {validationResult.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">View Details</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(validationResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>Repair User Profile:</strong> Creates missing user record in database</li>
            <li><strong>Validate User:</strong> Checks if user can place bids</li>
            <li><strong>Test Bid Placement:</strong> Attempts to place a test bid (automatically cleaned up)</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>After successful repair:</strong> You should be able to place bids normally. 
              Navigate to any auction and try bidding.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
