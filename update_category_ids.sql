-- Update existing categories to have the correct IDs that match the frontend
-- Run this in your Supabase SQL editor

-- First, let's see what we have
SELECT id, name, icon FROM public.categories ORDER BY name;

-- Update existing categories to have the expected IDs
-- We'll do this safely by updating one by one

-- Electronics
UPDATE public.categories 
SET id = '11111111-1111-1111-1111-111111111111', 
    icon = '💻',
    description = 'Computers, phones, gadgets and electronic devices',
    is_active = true
WHERE name = 'Electronics';

-- Art & Collectibles  
UPDATE public.categories 
SET id = '22222222-2222-2222-2222-222222222222',
    icon = '🎨', 
    description = 'Artwork, collectibles, antiques and memorabilia',
    is_active = true
WHERE name = 'Art & Collectibles' OR name ILIKE '%art%' OR name ILIKE '%collectible%';

-- Jewelry & Watches
UPDATE public.categories 
SET id = '33333333-3333-3333-3333-333333333333',
    icon = '💎',
    description = 'Fine jewelry, watches, and precious accessories', 
    is_active = true
WHERE name = 'Jewelry & Watches' OR name ILIKE '%jewelry%' OR name ILIKE '%watch%';

-- Vehicles
UPDATE public.categories 
SET id = '44444444-4444-4444-4444-444444444444',
    icon = '🚗',
    description = 'Cars, motorcycles, boats and other vehicles',
    is_active = true  
WHERE name = 'Vehicles' OR name ILIKE '%vehicle%' OR name ILIKE '%car%' OR name ILIKE '%auto%';

-- Real Estate
UPDATE public.categories 
SET id = '55555555-5555-5555-5555-555555555555',
    icon = '🏠',
    description = 'Properties, land and real estate opportunities',
    is_active = true
WHERE name = 'Real Estate' OR name ILIKE '%real estate%' OR name ILIKE '%property%';

-- Sports & Recreation  
UPDATE public.categories 
SET id = '66666666-6666-6666-6666-666666666666',
    icon = '🏀',
    description = 'Sports equipment, outdoor gear and recreational items',
    is_active = true
WHERE name = 'Sports & Recreation' OR name ILIKE '%sport%' OR name ILIKE '%recreation%';

-- Fashion & Accessories
UPDATE public.categories 
SET id = '77777777-7777-7777-7777-777777777777', 
    icon = '👕',
    description = 'Clothing, shoes, bags and fashion accessories',
    is_active = true
WHERE name = 'Fashion & Accessories' OR name ILIKE '%fashion%' OR name ILIKE '%clothing%';

-- Home & Garden
UPDATE public.categories 
SET id = '88888888-8888-8888-8888-888888888888',
    icon = '🏡', 
    description = 'Furniture, appliances, garden tools and home decor',
    is_active = true
WHERE name = 'Home & Garden' OR name ILIKE '%home%' OR name ILIKE '%garden%' OR name ILIKE '%furniture%';

-- Verify the updates
SELECT id, name, icon, description, is_active FROM public.categories ORDER BY name;
