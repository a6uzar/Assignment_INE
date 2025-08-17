import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UserRepairBanner() {
  const [isDismissed, setIsDismissed] = useState(
    localStorage.getItem('userRepairBannerDismissed') === 'true'
  );

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('userRepairBannerDismissed', 'true');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 mb-4">
      <Wrench className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <span className="font-medium text-orange-800">
            Having trouble placing bids?
          </span>
          <span className="text-orange-700 ml-2">
            Use our repair tool to fix account issues instantly.
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
            <Link to="/user-repair">
              <Wrench className="h-3 w-3 mr-1" />
              Fix Now
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
            className="text-orange-600 hover:text-orange-800 p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
