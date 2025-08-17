-- Migration to fix foreign key constraints for proper user deletion
-- This migration adds CASCADE DELETE to all foreign key constraints that reference users

-- First, let's drop existing foreign key constraints that don't have CASCADE
-- and recreate them with proper CASCADE DELETE behavior

-- Drop existing constraints (if they exist)
ALTER TABLE public.auctions DROP CONSTRAINT IF EXISTS auctions_seller_id_fkey;
ALTER TABLE public.auctions DROP CONSTRAINT IF EXISTS auctions_winner_id_fkey;
ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;
ALTER TABLE public.counter_offers DROP CONSTRAINT IF EXISTS counter_offers_seller_id_fkey;
ALTER TABLE public.counter_offers DROP CONSTRAINT IF EXISTS counter_offers_bidder_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_buyer_id_fkey;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_seller_id_fkey;
ALTER TABLE public.auction_watchers DROP CONSTRAINT IF EXISTS auction_watchers_user_id_fkey;

-- Recreate constraints with CASCADE DELETE
ALTER TABLE public.auctions 
  ADD CONSTRAINT auctions_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.auctions 
  ADD CONSTRAINT auctions_winner_id_fkey 
  FOREIGN KEY (winner_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.bids 
  ADD CONSTRAINT bids_bidder_id_fkey 
  FOREIGN KEY (bidder_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Check if counter_offers table exists and add constraints
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'counter_offers' AND table_schema = 'public') THEN
    ALTER TABLE public.counter_offers 
      ADD CONSTRAINT counter_offers_seller_id_fkey 
      FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.counter_offers 
      ADD CONSTRAINT counter_offers_bidder_id_fkey 
      FOREIGN KEY (bidder_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Check if transactions table exists and add constraints
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions' AND table_schema = 'public') THEN
    ALTER TABLE public.transactions 
      ADD CONSTRAINT transactions_buyer_id_fkey 
      FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    ALTER TABLE public.transactions 
      ADD CONSTRAINT transactions_seller_id_fkey 
      FOREIGN KEY (seller_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Check if auction_watchers table exists and add constraints
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auction_watchers' AND table_schema = 'public') THEN
    ALTER TABLE public.auction_watchers 
      ADD CONSTRAINT auction_watchers_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- Add a function to handle user deletion properly
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auctions where the user was the winner to remove winner reference
  UPDATE public.auctions 
  SET winner_id = NULL 
  WHERE winner_id = OLD.id;
  
  -- Mark auctions as cancelled if they are still active and owned by deleted user
  UPDATE public.auctions 
  SET status = 'cancelled', updated_at = NOW()
  WHERE seller_id = OLD.id AND status IN ('draft', 'scheduled', 'active');
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle user deletion
DROP TRIGGER IF EXISTS on_user_delete ON public.users;
CREATE TRIGGER on_user_delete
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_deletion();

-- Add a function to clean up auth user when public user is deleted
CREATE OR REPLACE FUNCTION handle_auth_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the auth user when public user is deleted
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth user cleanup (commented out for safety)
-- Uncomment only if you want public.users deletion to also delete auth.users
-- DROP TRIGGER IF EXISTS on_public_user_delete ON public.users;
-- CREATE TRIGGER on_public_user_delete
--   AFTER DELETE ON public.users
--   FOR EACH ROW
--   EXECUTE FUNCTION handle_auth_user_deletion();
