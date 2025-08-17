-- SAFE SOLUTION: Instead of changing existing category IDs, 
-- let's insert the missing categories with the correct IDs
-- and update auction references properly

-- Step 1: Insert missing categories with the expected IDs (ignore conflicts)
INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', '💻', 'Computers, phones, gadgets and electronic devices', true),
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', '🎨', 'Artwork, collectibles, antiques and memorabilia', true),
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', '💎', 'Fine jewelry, watches, and precious accessories', true),
('44444444-4444-4444-4444-444444444444', 'Vehicles', '🚗', 'Cars, motorcycles, boats and other vehicles', true),
('55555555-5555-5555-5555-555555555555', 'Real Estate', '🏠', 'Properties, land and real estate opportunities', true),
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', '🏀', 'Sports equipment, outdoor gear and recreational items', true),
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', '👕', 'Clothing, shoes, bags and fashion accessories', true),
('88888888-8888-8888-8888-888888888888', 'Home & Garden', '🏡', 'Furniture, appliances, garden tools and home decor', true)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Update auction references to use the correct category IDs
-- Update auctions that reference old category IDs

-- Electronics
UPDATE public.auctions 
SET category_id = '11111111-1111-1111-1111-111111111111'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE name = 'Electronics' AND id != '11111111-1111-1111-1111-111111111111'
);

-- Art & Collectibles
UPDATE public.auctions 
SET category_id = '22222222-2222-2222-2222-222222222222'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Art & Collectibles' OR name ILIKE '%art%' OR name ILIKE '%collectible%') 
    AND id != '22222222-2222-2222-2222-222222222222'
);

-- Jewelry & Watches
UPDATE public.auctions 
SET category_id = '33333333-3333-3333-3333-333333333333'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Jewelry & Watches' OR name ILIKE '%jewelry%' OR name ILIKE '%watch%') 
    AND id != '33333333-3333-3333-3333-333333333333'
);

-- Vehicles
UPDATE public.auctions 
SET category_id = '44444444-4444-4444-4444-444444444444'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Vehicles' OR name ILIKE '%vehicle%' OR name ILIKE '%car%' OR name ILIKE '%auto%') 
    AND id != '44444444-4444-4444-4444-444444444444'
);

-- Real Estate
UPDATE public.auctions 
SET category_id = '55555555-5555-5555-5555-555555555555'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Real Estate' OR name ILIKE '%real estate%' OR name ILIKE '%property%') 
    AND id != '55555555-5555-5555-5555-555555555555'
);

-- Sports & Recreation
UPDATE public.auctions 
SET category_id = '66666666-6666-6666-6666-666666666666'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Sports & Recreation' OR name ILIKE '%sport%' OR name ILIKE '%recreation%') 
    AND id != '66666666-6666-6666-6666-666666666666'
);

-- Fashion & Accessories
UPDATE public.auctions 
SET category_id = '77777777-7777-7777-7777-777777777777'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Fashion & Accessories' OR name ILIKE '%fashion%' OR name ILIKE '%clothing%') 
    AND id != '77777777-7777-7777-7777-777777777777'
);

-- Home & Garden
UPDATE public.auctions 
SET category_id = '88888888-8888-8888-8888-888888888888'
WHERE category_id IN (
    SELECT id FROM public.categories 
    WHERE (name = 'Home & Garden' OR name ILIKE '%home%' OR name ILIKE '%garden%' OR name ILIKE '%furniture%') 
    AND id != '88888888-8888-8888-8888-888888888888'
);

-- Step 3: Clean up old unused categories (only if they're not referenced)
DELETE FROM public.categories 
WHERE id NOT IN ('11111111-1111-1111-1111-111111111111',
                 '22222222-2222-2222-2222-222222222222',
                 '33333333-3333-3333-3333-333333333333',
                 '44444444-4444-4444-4444-444444444444',
                 '55555555-5555-5555-5555-555555555555',
                 '66666666-6666-6666-6666-666666666666',
                 '77777777-7777-7777-7777-777777777777',
                 '88888888-8888-8888-8888-888888888888')
AND id NOT IN (SELECT DISTINCT category_id FROM public.auctions WHERE category_id IS NOT NULL);

-- Step 4: Verify the final state
SELECT 
    c.id,
    c.name,
    c.icon,
    COUNT(a.id) as auction_count
FROM public.categories c
LEFT JOIN public.auctions a ON c.id = a.category_id
GROUP BY c.id, c.name, c.icon
ORDER BY c.name;
