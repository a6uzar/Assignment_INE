import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSampleAuctions } from '@/utils/sampleData';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export function DevUtils() {
  const [loading, setLoading] = useState(false);

  const handleCreateSampleData = async () => {
    setLoading(true);
    try {
      const success = await createSampleAuctions();
      if (success) {
        toast.success('Sample auctions created successfully!');
        // Refresh the page to show new data
        window.location.reload();
      } else {
        toast.error('Failed to create sample auctions');
      }
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast.error('Error creating sample data');
    } finally {
      setLoading(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50 bg-yellow-50 border-yellow-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-800">Dev Utils</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          onClick={handleCreateSampleData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {loading ? 'Creating...' : 'Create Sample Auctions'}
        </Button>
      </CardContent>
    </Card>
  );
}
