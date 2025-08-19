# Live Bid Dashboard - Production Guide

## 🚀 Quick Start

### Local Development
1. Copy `.env.example` to `.env.local`
2. Add your Supabase credentials to `.env.local`
3. Run `npm install` and `npm run dev`

### Production Deployment on Render
1. Set environment variables in Render dashboard:
   - `NODE_ENV=production`
   - `VITE_SUPABASE_URL=your-supabase-url`
   - `VITE_SUPABASE_ANON_KEY=your-anon-key`

2. Deploy via GitHub integration or manual deploy

## 📋 Environment Variables

### Required for Production:
```bash
NODE_ENV=production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optional:
```bash
PORT=10000  # Render sets this automatically
```

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js server for static file serving
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Docker on Render
- **Real-time**: Supabase Realtime for live bidding

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── auction/        # Auction-specific components
│   ├── auth/           # Authentication
│   ├── layout/         # Layout components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── pages/              # Page components
└── integrations/       # External service integrations
```

## 🔧 Build Process

1. **Development**: `npm run dev` - Vite dev server
2. **Production Build**: `npm run build` - Creates optimized bundle
3. **Preview**: `npm run preview` - Test production build locally

## 🚀 Deployment

### Build Optimization:
- Code splitting for vendor, UI, and utility bundles
- Tree shaking for unused code elimination
- Asset optimization and compression

### Performance:
- Static file caching
- Gzip compression
- Optimized bundle sizes

## 🔒 Security

- No credentials in repository
- Environment variables for all secrets
- Security headers in production
- Input validation and sanitization

## 📊 Health Monitoring

- `/status` - Simple health check
- `/health` - Detailed system information
- `/env-info` - Environment variable status

## 🛠️ Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm start           # Start production server
```

## 📝 Current Status

✅ **Production Deployment**: https://live-bid-dash.onrender.com
✅ **Health Checks**: Optimized for fast response
✅ **Environment Variables**: Properly configured
✅ **Security**: Credentials secured
✅ **Performance**: Bundle optimized (673kB main bundle)

## 🔄 Deployment Timeline

**Expected deployment times after optimizations:**
- Code changes: 5-10 minutes
- Dependency changes: 7-13 minutes  
- Major changes: 13-22 minutes

## 📞 Support

For issues or questions:
1. Check deployment logs in Render dashboard
2. Test health endpoints
3. Verify environment variables are set correctly

---
*Last Updated: August 20, 2025*
