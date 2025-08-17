-- ROBUST SOLUTION: Handle all edge cases properly
-- This will definitely fix the category issue

-- Step 1: First, let's see exactly what we have
SELECT 'Current categories:' as info;
SELECT id, name, icon FROM public.categories ORDER BY name;

-- Step 2: Handle the Art & Collectibles category specifically
-- Delete any existing conflicting categories for Art & Collectibles first
DELETE FROM public.categories 
WHERE (name = 'Art & Collectibles' OR name ILIKE '%art%' OR name ILIKE '%collectible%')
AND id != '22222222-2222-2222-2222-222222222222';

-- Step 3: Insert or update the specific category we need
INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('22222222-2222-2222-2222-222222222222', 'Art & Collectibles', '🎨', 'Artwork, collectibles, antiques and memorabilia', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Step 4: Insert all other categories (handling conflicts properly)
INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'Electronics', '💻', 'Computers, phones, gadgets and electronic devices', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('33333333-3333-3333-3333-333333333333', 'Jewelry & Watches', '💎', 'Fine jewelry, watches, and precious accessories', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('44444444-4444-4444-4444-444444444444', 'Vehicles', '🚗', 'Cars, motorcycles, boats and other vehicles', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('55555555-5555-5555-5555-555555555555', 'Real Estate', '🏠', 'Properties, land and real estate opportunities', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('66666666-6666-6666-6666-666666666666', 'Sports & Recreation', '🏀', 'Sports equipment, outdoor gear and recreational items', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('77777777-7777-7777-7777-777777777777', 'Fashion & Accessories', '👕', 'Clothing, shoes, bags and fashion accessories', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

INSERT INTO public.categories (id, name, icon, description, is_active) VALUES
('88888888-8888-8888-8888-888888888888', 'Home & Garden', '🏡', 'Furniture, appliances, garden tools and home decor', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Step 5: Verify the Art & Collectibles category exists
SELECT 'Verification - Art & Collectibles category:' as info;
SELECT id, name, icon, description, is_active 
FROM public.categories 
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Step 6: Show all categories
SELECT 'Final categories:' as info;
SELECT id, name, icon, is_active FROM public.categories ORDER BY name;
