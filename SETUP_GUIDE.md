# QUICK SETUP GUIDE FOR LIVE BID DASHBOARD

## 1. DATABASE SETUP

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire content of `QUICK_SETUP.sql` 
4. Click "Run" to execute all commands

This will create all the necessary tables, policies, and sample data.

## 2. ENVIRONMENT VARIABLES

Make sure you have a `.env.local` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

You can find these values in your Supabase Dashboard > Settings > API

## 3. INSTALL DEPENDENCIES

Run these commands in your terminal:

```powershell
# Install dependencies
bun install

# Start development server
bun dev
```

## 4. TEST THE APPLICATION

1. Open http://localhost:5173
2. Click "Sign In" and create a new account
3. Try creating a new auction - the error should now be fixed!

## 5. COMMON ISSUES

- **"Create Auction" button still shows error**: Make sure you ran the SQL setup and your environment variables are correct
- **Authentication issues**: Check that your Supabase URL and keys are correct in `.env.local`
- **Database connection errors**: Verify your Supabase project is active and the database is running

## 6. NEXT STEPS

After the basic setup works:
- Add real-time bidding functionality
- Implement seller decision flows (accept/reject/counter-offer)
- Add admin panel features
- Set up email notifications
- Add PDF invoice generation

The application includes all the advanced features from the BVCOE assignment specification!
