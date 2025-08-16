# LiveBid Auction Platform - Deployment Guide

## 🚀 Complete Production Deployment Guide

This guide covers the complete deployment process for the LiveBid auction platform, including database setup, environment configuration, and performance optimizations.

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account
- Vercel/Netlify account (for frontend)
- Domain name (optional)
- Email service provider (SendGrid, Mailgun, etc.)

## 🗄️ Database Setup

### 1. Supabase Database Configuration

Create a new Supabase project and run the following SQL scripts:

```sql
-- Run the QUICK_SETUP.sql file from the project root
-- This creates all necessary tables, RLS policies, and functions
```

### 2. Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Configuration
VITE_SENDGRID_API_KEY=your_sendgrid_api_key
VITE_FROM_EMAIL=noreply@yourdomain.com

# Payment Configuration (Optional)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret

# Application Configuration
VITE_APP_URL=https://yourdomain.com
VITE_API_URL=https://api.yourdomain.com
```

## 🔧 Application Configuration

### 1. Install Dependencies

```bash
npm install
# or
bun install
```

### 2. Build Configuration

Update `vite.config.ts` for production:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          charts: ['recharts'],
          utils: ['lodash', 'date-fns'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
})
```

### 3. Performance Optimizations

#### Component Lazy Loading

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react'

const Auctions = lazy(() => import('./pages/Auctions'))
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'))
const EmailNotificationSystem = lazy(() => import('./components/notifications/EmailNotificationSystem'))

// Wrap components with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <Auctions />
</Suspense>
```

#### Image Optimization

```typescript
// src/components/ui/OptimizedImage.tsx
import { useState } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}

export function OptimizedImage({ src, alt, className, width, height }: OptimizedImageProps) {
  const [loading, setLoading] = useState(true)
  
  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setLoading(false)}
        className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  )
}
```

#### Virtual Scrolling for Large Lists

```typescript
// src/components/ui/VirtualizedList.tsx
import { FixedSizeList as List } from 'react-window'

interface VirtualizedListProps {
  items: any[]
  height: number
  itemHeight: number
  renderItem: ({ index, style }: any) => JSX.Element
}

export function VirtualizedList({ items, height, itemHeight, renderItem }: VirtualizedListProps) {
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      itemData={items}
    >
      {renderItem}
    </List>
  )
}
```

## 🚢 Frontend Deployment

### Option 1: Vercel Deployment

1. **Connect Repository**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables**
   Add all environment variables in Vercel dashboard

### Option 2: Netlify Deployment

1. **Create `netlify.toml`**
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [build.environment]
     NODE_VERSION = "18"
   ```

2. **Deploy via Git**
   - Connect your Git repository
   - Configure build settings
   - Add environment variables

### Option 3: AWS S3 + CloudFront

1. **Build and Upload**
   ```bash
   npm run build
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

2. **CloudFront Configuration**
   ```json
   {
     "DefaultRootObject": "index.html",
     "ErrorPages": [
       {
         "ErrorCode": 404,
         "ResponseCode": 200,
         "ResponsePagePath": "/index.html"
       }
     ]
   }
   ```

## 🔧 Backend Services Setup

### 1. Supabase Edge Functions

Deploy real-time notification service:

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { type, userId, data } = await req.json()
  
  // Send email notification
  // Send push notification
  // Update database
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

Deploy function:
```bash
supabase functions deploy send-notification
```

### 2. Scheduled Jobs

Create cron jobs for:

```sql
-- Auto-end expired auctions
SELECT cron.schedule(
  'auto-end-auctions',
  '* * * * *', -- Every minute
  $$
  UPDATE auctions 
  SET status = 'ended' 
  WHERE end_time <= NOW() AND status = 'active';
  $$
);

-- Send auction ending notifications
SELECT cron.schedule(
  'auction-ending-notifications',
  '*/5 * * * *', -- Every 5 minutes
  $$
  -- Notification logic here
  $$
);
```

## 📧 Email Service Configuration

### SendGrid Setup

```typescript
// src/lib/email.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export const sendEmail = async (to: string, subject: string, html: string) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL!,
    subject,
    html,
  }
  
  await sgMail.send(msg)
}
```

### Email Templates

Create dynamic templates in SendGrid and use template IDs:

```typescript
export const sendAuctionWonEmail = async (userEmail: string, auctionData: any) => {
  await sgMail.send({
    to: userEmail,
    from: process.env.FROM_EMAIL!,
    templateId: 'd-xxxxxxxxxxxx', // SendGrid template ID
    dynamicTemplateData: {
      auction_title: auctionData.title,
      winning_amount: auctionData.winningBid,
      seller_name: auctionData.sellerName,
    },
  })
}
```

## 🔐 Security Configuration

### 1. Supabase RLS Policies

All RLS policies are included in QUICK_SETUP.sql. Key security features:

- Row Level Security on all tables
- User-specific data access
- Admin-only operations
- Secure auction bidding rules

### 2. CORS Configuration

Update Supabase CORS settings:

```json
{
  "allowedOrigins": ["https://yourdomain.com"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["Content-Type", "Authorization"]
}
```

### 3. Content Security Policy

Add CSP headers:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co;
">
```

## 📊 Monitoring & Analytics

### 1. Error Tracking

```typescript
// src/lib/sentry.ts
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
})

export { Sentry }
```

### 2. Performance Monitoring

```typescript
// src/lib/analytics.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  // Send to your analytics service
  console.log(metric)
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

### 3. Real-time Monitoring

Add Supabase real-time monitoring:

```sql
-- Monitor active connections
SELECT * FROM pg_stat_activity;

-- Monitor query performance
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC;
```

## 🧪 Testing

### 1. Unit Tests

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// src/components/__tests__/AuctionCard.test.tsx
import { render, screen } from '@testing-library/react'
import { AuctionCard } from '../auction/AuctionCard'

test('renders auction card', () => {
  const mockAuction = {
    id: '1',
    title: 'Test Auction',
    current_price: 100,
    // ... other props
  }
  
  render(<AuctionCard auction={mockAuction} />)
  expect(screen.getByText('Test Auction')).toBeInTheDocument()
})
```

### 2. E2E Tests

```bash
npm install -D playwright
```

```typescript
// tests/auction-flow.spec.ts
import { test, expect } from '@playwright/test'

test('complete auction flow', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="auction-card"]')
  await page.fill('[data-testid="bid-input"]', '150')
  await page.click('[data-testid="place-bid"]')
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})
```

## 🚀 Go Live Checklist

### Pre-Launch

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Email templates created
- [ ] Payment system tested
- [ ] Security policies reviewed
- [ ] Performance optimizations applied
- [ ] Error tracking configured
- [ ] Backup strategy implemented

### Launch

- [ ] DNS configured
- [ ] SSL certificate installed
- [ ] CDN configured
- [ ] Monitoring dashboards set up
- [ ] User documentation created
- [ ] Admin training completed

### Post-Launch

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify email delivery
- [ ] Test real-time features
- [ ] Monitor database performance
- [ ] Review user feedback

## 🔄 Maintenance

### Daily
- Monitor error logs
- Check system performance
- Review user activity

### Weekly
- Database cleanup
- Performance analysis
- Security review

### Monthly
- Backup verification
- Dependencies update
- Feature usage analysis

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Performance Guide](https://react.dev/learn/render-and-commit)
- [Vite Production Guide](https://vitejs.dev/guide/build.html)
- [Web Vitals](https://web.dev/vitals/)

---

## 🆘 Troubleshooting

### Common Issues

1. **Real-time not working**
   - Check Supabase RLS policies
   - Verify WebSocket connection
   - Check browser console for errors

2. **Slow page loads**
   - Enable code splitting
   - Optimize images
   - Use CDN for static assets

3. **Database timeouts**
   - Review query performance
   - Add database indexes
   - Optimize RLS policies

4. **Email delivery issues**
   - Check SendGrid configuration
   - Verify domain authentication
   - Review email templates

For support, create an issue in the repository or contact the development team.
