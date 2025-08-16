# Database Setup Instructions

To set up your Supabase database with the auction system schema:

## Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref rbsvkrlzxlqnvoxbvnvb
```

4. Run migrations:
```bash
supabase db push
```

## Option 2: Manual Setup via Supabase Dashboard

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/rbsvkrlzxlqnvoxbvnvb
2. Navigate to SQL Editor
3. Run each migration file in order:
   - 001_initial_schema.sql
   - 002_rls_policies.sql
   - 003_functions.sql
   - 004_triggers.sql
   - 005_sample_data.sql

## Option 3: Using the SQL files directly

Copy and paste the contents of each migration file into your Supabase SQL editor in the following order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/migrations/004_triggers.sql`
5. `supabase/migrations/005_sample_data.sql`

## Verification

After running the migrations, you should see these tables in your database:
- users
- categories
- auctions
- bids
- notifications
- counter_offers
- transactions
- auction_watchers

## Next Steps

1. Update your environment variables in `.env.local`
2. Start the development server: `npm run dev`
3. Test the auction creation and bidding functionality
