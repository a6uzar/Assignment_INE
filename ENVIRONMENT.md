# Environment Configuration Guide

## Overview
This project automatically detects the environment and configures Supabase accordingly - **no manual configuration needed!**

## Automatic Environment Detection

### 🔧 Development Mode (localhost)
- **Automatically detected when**: Running on `localhost` or `127.0.0.1`
- **Uses**: Local Supabase instance (`http://127.0.0.1:54321`)
- **Storage**: Local storage bucket for testing
- **Data**: Isolated development data

### 🚀 Production Mode (deployed)
- **Automatically detected when**: Deployed to any hosting platform
- **Uses**: Production Supabase (`https://rbsvkrlzxlqnvoxbvnvb.supabase.co`)
- **Storage**: Production storage bucket
- **Data**: Live production data

## Setup Instructions

### For Local Development:
1. Start Supabase: `npx supabase start`
2. Start dev server: `npm run dev`
3. **That's it!** - Environment automatically detected

### For Production Deployment:
1. Deploy to your hosting platform (Vercel, Netlify, etc.)
2. **That's it!** - Production environment automatically detected

## How It Works

The application automatically detects the environment using:
```javascript
const isProduction = import.meta.env.PROD || 
                    window.location.hostname !== 'localhost' && 
                    window.location.hostname !== '127.0.0.1';
```

## Benefits:
- ✅ **Zero Configuration**: No manual environment variables to set
- ✅ **Deploy Ready**: Push to production without any changes
- ✅ **Development Friendly**: Automatic local Supabase detection
- ✅ **Team Ready**: Works for all developers out of the box
- ✅ **Error Proof**: No risk of accidentally using wrong environment

## Image Upload Behavior:
- **Local Development**: Images stored in local Supabase storage
- **Production**: Images stored in production Supabase storage
- **Automatic Bucket Creation**: Creates storage bucket if it doesn't exist

## Console Output:
- **Development**: 🔧 Development Mode - Using Local Supabase
- **Production**: 🚀 Production Mode - Using Remote Supabase

## Migration Support:
All database migrations work in both environments with automatic bucket creation for production deployments.
