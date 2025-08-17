-- Query to check current foreign key constraints in your database
-- Run this in Supabase Dashboard SQL Editor

-- 1. Show all tables in public schema
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Show all foreign key constraints that reference the users table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    COALESCE(rc.delete_rule, 'NO ACTION') AS delete_rule,
    COALESCE(rc.update_rule, 'NO ACTION') AS update_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'users'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Count records in each table for impact assessment
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count 
FROM public.users
UNION ALL
SELECT 
    'auctions' as table_name, 
    COUNT(*) as record_count 
FROM public.auctions
UNION ALL
SELECT 
    'bids' as table_name, 
    COUNT(*) as record_count 
FROM public.bids
UNION ALL
SELECT 
    'notifications' as table_name, 
    COUNT(*) as record_count 
FROM public.notifications;

-- 4. Show users and their related data count
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.created_at,
    COALESCE(auction_counts.auction_count, 0) as total_auctions,
    COALESCE(active_auction_counts.active_auction_count, 0) as active_auctions,
    COALESCE(bid_counts.bid_count, 0) as total_bids,
    COALESCE(notification_counts.notification_count, 0) as total_notifications
FROM public.users u
LEFT JOIN (
    SELECT seller_id, COUNT(*) as auction_count 
    FROM public.auctions 
    GROUP BY seller_id
) auction_counts ON u.id = auction_counts.seller_id
LEFT JOIN (
    SELECT seller_id, COUNT(*) as active_auction_count 
    FROM public.auctions 
    WHERE status IN ('active', 'scheduled') 
    GROUP BY seller_id
) active_auction_counts ON u.id = active_auction_counts.seller_id
LEFT JOIN (
    SELECT bidder_id, COUNT(*) as bid_count 
    FROM public.bids 
    GROUP BY bidder_id
) bid_counts ON u.id = bid_counts.bidder_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as notification_count 
    FROM public.notifications 
    GROUP BY user_id
) notification_counts ON u.id = notification_counts.user_id
ORDER BY u.created_at DESC;

-- 5. Show sample of problematic user ID (the one that failed to delete)
SELECT 
    u.*,
    'User that failed to delete' as note
FROM public.users u 
WHERE u.id = '07d06212-d73f-43fc-89d2-36b08553c79f';

-- 6. Show what's preventing this user from being deleted
SELECT 
    'auctions' as table_name,
    COUNT(*) as blocking_records
FROM public.auctions 
WHERE seller_id = '07d06212-d73f-43fc-89d2-36b08553c79f'
UNION ALL
SELECT 
    'auctions_as_winner' as table_name,
    COUNT(*) as blocking_records
FROM public.auctions 
WHERE winner_id = '07d06212-d73f-43fc-89d2-36b08553c79f'
UNION ALL
SELECT 
    'bids' as table_name,
    COUNT(*) as blocking_records
FROM public.bids 
WHERE bidder_id = '07d06212-d73f-43fc-89d2-36b08553c79f'
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as blocking_records
FROM public.notifications 
WHERE user_id = '07d06212-d73f-43fc-89d2-36b08553c79f';
