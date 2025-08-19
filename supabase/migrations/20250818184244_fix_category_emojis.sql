-- Fix all category emojis by updating existing records
-- First, update any existing categories with correct emojis
UPDATE "public"."categories" SET "icon" = '💻' WHERE "name" = 'Electronics';
UPDATE "public"."categories" SET "icon" = '🎨' WHERE "name" = 'Art & Collectibles';
UPDATE "public"."categories" SET "icon" = '💎' WHERE "name" = 'Jewelry & Watches';
UPDATE "public"."categories" SET "icon" = '🚗' WHERE "name" = 'Vehicles';
UPDATE "public"."categories" SET "icon" = '🏠' WHERE "name" = 'Real Estate';
UPDATE "public"."categories" SET "icon" = '🏀' WHERE "name" = 'Sports & Recreation';
UPDATE "public"."categories" SET "icon" = '👕' WHERE "name" = 'Fashion & Accessories';
UPDATE "public"."categories" SET "icon" = '🏡' WHERE "name" = 'Home & Garden';

-- Also handle variations in category names that might exist
UPDATE "public"."categories" SET "icon" = '💻' WHERE "name" ILIKE '%electronic%' AND "icon" != '💻';
UPDATE "public"."categories" SET "icon" = '🎨' WHERE ("name" ILIKE '%art%' OR "name" ILIKE '%collectible%') AND "icon" != '🎨';
UPDATE "public"."categories" SET "icon" = '💎' WHERE ("name" ILIKE '%jewelry%' OR "name" ILIKE '%watch%') AND "icon" != '💎';
UPDATE "public"."categories" SET "icon" = '🚗' WHERE ("name" ILIKE '%vehicle%' OR "name" ILIKE '%car%' OR "name" ILIKE '%auto%') AND "icon" != '🚗';
UPDATE "public"."categories" SET "icon" = '🏠' WHERE ("name" ILIKE '%real estate%' OR "name" ILIKE '%property%') AND "icon" != '🏠';
UPDATE "public"."categories" SET "icon" = '🏀' WHERE ("name" ILIKE '%sport%' OR "name" ILIKE '%recreation%') AND "icon" != '🏀';
UPDATE "public"."categories" SET "icon" = '👕' WHERE ("name" ILIKE '%fashion%' OR "name" ILIKE '%accessor%' OR "name" ILIKE '%clothing%') AND "icon" != '👕';
UPDATE "public"."categories" SET "icon" = '🏡' WHERE ("name" ILIKE '%home%' OR "name" ILIKE '%garden%') AND "icon" != '🏡';

-- Update any categories with text-based icons to emojis
UPDATE "public"."categories" SET "icon" = '📦' WHERE "icon" IN ('Package', 'package', 'Other', 'other');
UPDATE "public"."categories" SET "icon" = '💻' WHERE "icon" IN ('Computer', 'computer', 'Electronics', 'electronics');
UPDATE "public"."categories" SET "icon" = '�' WHERE "icon" IN ('Art', 'art', 'Collectibles', 'collectibles');
UPDATE "public"."categories" SET "icon" = '�' WHERE "icon" IN ('Jewelry', 'jewelry', 'Watches', 'watches');
UPDATE "public"."categories" SET "icon" = '🚗' WHERE "icon" IN ('Vehicle', 'vehicle', 'Car', 'car');
UPDATE "public"."categories" SET "icon" = '🏠' WHERE "icon" IN ('House', 'house', 'Property', 'property');
UPDATE "public"."categories" SET "icon" = '🏀' WHERE "icon" IN ('Sports', 'sports', 'Recreation', 'recreation');
UPDATE "public"."categories" SET "icon" = '👕' WHERE "icon" IN ('Fashion', 'fashion', 'Clothing', 'clothing');
UPDATE "public"."categories" SET "icon" = '🏡' WHERE "icon" IN ('Home', 'home', 'Garden', 'garden');
