-- Utility function to safely delete a user and all related data
-- This function can be called from the Supabase dashboard or via RPC

CREATE OR REPLACE FUNCTION safe_delete_user(user_id_to_delete UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auction_count INTEGER;
  bid_count INTEGER;
  notification_count INTEGER;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id_to_delete) THEN
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

    -- 3. Delete notifications (CASCADE will handle this, but explicit for clarity)
    DELETE FROM public.notifications WHERE user_id = user_id_to_delete;

    -- 4. Delete bids (CASCADE will handle this)
    DELETE FROM public.bids WHERE bidder_id = user_id_to_delete;

    -- 5. Delete auction watchers
    DELETE FROM public.auction_watchers WHERE user_id = user_id_to_delete;

    -- 6. Delete counter offers
    DELETE FROM public.counter_offers WHERE seller_id = user_id_to_delete OR bidder_id = user_id_to_delete;

    -- 7. Delete transactions
    DELETE FROM public.transactions WHERE buyer_id = user_id_to_delete OR seller_id = user_id_to_delete;

    -- 8. Finally delete the public user record
    DELETE FROM public.users WHERE id = user_id_to_delete;

    -- 9. Delete from auth.users (requires SECURITY DEFINER)
    DELETE FROM auth.users WHERE id = user_id_to_delete;

    -- Build success response
    result := json_build_object(
      'success', true,
      'message', 'User successfully deleted',
      'user_id', user_id_to_delete,
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

-- Grant execute permission to authenticated users (optional, for admin use)
-- GRANT EXECUTE ON FUNCTION safe_delete_user(UUID) TO authenticated;

-- Create a function to get user deletion preview (what would be deleted)
CREATE OR REPLACE FUNCTION preview_user_deletion(user_id_to_check UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auction_count INTEGER;
  bid_count INTEGER;
  notification_count INTEGER;
  watcher_count INTEGER;
  active_auction_count INTEGER;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = user_id_to_check) THEN
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
  SELECT COUNT(*) INTO watcher_count FROM public.auction_watchers WHERE user_id = user_id_to_check;

  result := json_build_object(
    'success', true,
    'user_id', user_id_to_check,
    'deletion_impact', json_build_object(
      'total_auctions', auction_count,
      'active_auctions_to_cancel', active_auction_count,
      'bids_to_delete', bid_count,
      'notifications_to_delete', notification_count,
      'watched_auctions', watcher_count
    ),
    'warning', CASE 
      WHEN active_auction_count > 0 THEN 'This user has active auctions that will be cancelled'
      ELSE 'Safe to delete'
    END
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
