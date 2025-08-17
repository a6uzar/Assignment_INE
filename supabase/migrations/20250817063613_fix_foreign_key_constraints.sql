-- Fix foreign key constraints to allow proper user deletion
-- This migration only fixes the constraints without creating existing objects

-- 1. Drop existing foreign key constraints that reference users (if they exist)
DO $$
BEGIN
  -- Drop constraints if they exist
  BEGIN
    ALTER TABLE public.auctions DROP CONSTRAINT IF EXISTS auctions_seller_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auctions_seller_id_fkey constraint does not exist or already dropped';
  END;

  BEGIN
    ALTER TABLE public.auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auctions_winner_id_fkey constraint does not exist or already dropped';
  END;

  BEGIN
    ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'bids_bidder_id_fkey constraint does not exist or already dropped';
  END;

  BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notifications_user_id_fkey constraint does not exist or already dropped';
  END;
END $$;

-- 2. Recreate constraints with proper CASCADE behavior
DO $$
BEGIN
  -- Auctions table constraints
  ALTER TABLE public.auctions 
    ADD CONSTRAINT auctions_seller_id_fkey 
    FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

  -- Winner can be set to NULL when user is deleted
  ALTER TABLE public.auctions 
    ADD CONSTRAINT auctions_winner_id_fkey 
    FOREIGN KEY (winner_id) REFERENCES public.users(id) ON DELETE SET NULL;

  -- Bids table constraints
  ALTER TABLE public.bids 
    ADD CONSTRAINT bids_bidder_id_fkey 
    FOREIGN KEY (bidder_id) REFERENCES public.users(id) ON DELETE CASCADE;

  -- Notifications table constraints
  BEGIN
    ALTER TABLE public.notifications 
      ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'notifications_user_id_fkey constraint already exists';
  END;

  RAISE NOTICE 'Foreign key constraints updated successfully';
END $$;

-- 3. Create safe user deletion function
CREATE OR REPLACE FUNCTION safe_delete_user(user_id_to_delete UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auction_count INTEGER;
  bid_count INTEGER;
  notification_count INTEGER;
  user_email TEXT;
BEGIN
  -- Get user info before deletion
  SELECT email INTO user_email FROM public.users WHERE id = user_id_to_delete;
  
  -- Check if user exists
  IF user_email IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'User not found',
      'user_id', user_id_to_delete
    );
  END IF;

  -- Count related data before deletion
  SELECT COUNT(*) INTO auction_count FROM public.auctions WHERE seller_id = user_id_to_delete;
  SELECT COUNT(*) INTO bid_count FROM public.bids WHERE bidder_id = user_id_to_delete;
  SELECT COUNT(*) INTO notification_count FROM public.notifications WHERE user_id = user_id_to_delete;

  -- Start transaction
  BEGIN
    -- 1. Cancel active auctions owned by the user
    UPDATE public.auctions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE seller_id = user_id_to_delete AND status IN ('draft', 'scheduled', 'active');

    -- 2. Remove user as winner from any auctions
    UPDATE public.auctions 
    SET winner_id = NULL 
    WHERE winner_id = user_id_to_delete;

    -- 3. Delete the public user record (CASCADE will handle related data)
    DELETE FROM public.users WHERE id = user_id_to_delete;

    -- Build success response
    result := json_build_object(
      'success', true,
      'message', 'User successfully deleted',
      'user_id', user_id_to_delete,
      'user_email', user_email,
      'deleted_data', json_build_object(
        'auctions', auction_count,
        'bids', bid_count,
        'notifications', notification_count
      )
    );

  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    result := json_build_object(
      'success', false,
      'message', 'Error deleting user: ' || SQLERRM,
      'user_id', user_id_to_delete
    );
  END;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create preview function
CREATE OR REPLACE FUNCTION preview_user_deletion(user_id_to_check UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auction_count INTEGER;
  bid_count INTEGER;
  notification_count INTEGER;
  active_auction_count INTEGER;
  user_email TEXT;
BEGIN
  -- Get user info
  SELECT email INTO user_email FROM public.users WHERE id = user_id_to_check;
  
  -- Check if user exists
  IF user_email IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'message', 'User not found',
      'user_id', user_id_to_check
    );
  END IF;

  -- Count related data
  SELECT COUNT(*) INTO auction_count FROM public.auctions WHERE seller_id = user_id_to_check;
  SELECT COUNT(*) INTO active_auction_count FROM public.auctions WHERE seller_id = user_id_to_check AND status IN ('active', 'scheduled');
  SELECT COUNT(*) INTO bid_count FROM public.bids WHERE bidder_id = user_id_to_check;
  SELECT COUNT(*) INTO notification_count FROM public.notifications WHERE user_id = user_id_to_check;

  result := json_build_object(
    'success', true,
    'user_id', user_id_to_check,
    'user_email', user_email,
    'deletion_impact', json_build_object(
      'total_auctions', auction_count,
      'active_auctions_to_cancel', active_auction_count,
      'bids_to_delete', bid_count,
      'notifications_to_delete', notification_count
    ),
    'warning', CASE 
      WHEN active_auction_count > 0 THEN 'This user has active auctions that will be cancelled'
      ELSE 'Safe to delete'
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION safe_delete_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION preview_user_deletion(UUID) TO service_role;