-- Add missing notification types for bid acceptance and payment flow
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'bid_accepted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'bid_rejected';  
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'payment_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'item_shipped';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'feedback_received';
