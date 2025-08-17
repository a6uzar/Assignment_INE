-- Safe approach: First check what categories and auctions exist
-- Run this in your Supabase SQL editor

-- 1. See current categories and their IDs
SELECT id, name, icon, description FROM public.categories ORDER BY name;

-- 2. See which categories are being used by auctions
SELECT 
    c.id as category_id,
    c.name as category_name,
    COUNT(a.id) as auction_count
FROM public.categories c
LEFT JOIN public.auctions a ON c.id = a.category_id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 3. See specific auctions that are blocking the update
SELECT 
    a.id as auction_id,
    a.title,
    a.category_id,
    c.name as category_name
FROM public.auctions a
JOIN public.categories c ON a.category_id = c.id
WHERE c.id = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
