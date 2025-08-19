# 🚀 Environment Variables Setup Guide for Render Deployment

## The Issue
Docker containers don't automatically inherit your local environment variables, AND Vite environment variables need to be available at BUILD TIME, not just runtime.

## 🔄 Two Types of Environment Variables

### 1. **Runtime Environment Variables** (Server/Docker)
- Set in Render dashboard "Environment" tab
- Available when the container runs
- Examples: `NODE_ENV`, `PORT`

### 2. **Build-Time Environment Variables** (Vite)
- Needed when Vite builds the JavaScript bundle  
- Must be passed to Docker build process
- Examples: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## ✅ Required Environment Variables for Render

### **In Render Dashboard (Environment Tab):**
```bash
# Runtime variables
NODE_ENV=production
PORT=3000

# Build-time variables (for Docker build)
VITE_SUPABASE_URL=https://rbsvkrlzxlqnvoxbvnvb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJic3Zrcmx6eGxxbnZveGJ2bnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzc1MjMsImV4cCI6MjA3MDg1MzUyM30.CKOCAkzs3cXlvNiIr-mfxHmWIg1ITJMbC5hQQqELSog
```

## � How Docker Now Handles This

The updated Dockerfile now:
1. **Accepts build arguments** for Vite variables
2. **Uses them during the build process**
3. **Falls back to hardcoded values** if not provided

```dockerfile
# Accept build arguments
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build with these variables available
RUN npm run build
```

## 🔧 Render's Automatic Behavior

**Good news:** Render automatically passes environment variables as build arguments to Docker! So when you set `VITE_SUPABASE_URL` in Render's environment tab, it becomes available during the Docker build process.

## � Setup Steps

1. **In Render Dashboard** → Your Service → **Environment Tab**
2. **Add these variables:**
   ```
   NODE_ENV=production
   PORT=3000
   VITE_SUPABASE_URL=https://rbsvkrlzxlqnvoxbvnvb.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJic3Zrcmx6eGxxbnZveGJ2bnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNzc1MjMsImV4cCI6MjA3MDg1MzUyM30.CKOCAkzs3cXlvNiIr-mfxHmWIg1ITJMbC5hQQqELSog
   ```
3. **Deploy** → The build process will now have access to these variables

## ✅ Success Indicators

In the browser console, you should see:
```
� Supabase Configuration:
   Environment: Production
   VITE_SUPABASE_URL: set from env
   VITE_SUPABASE_ANON_KEY: set from env
   Final URL: https://rbsvkrlzxlqnvoxbvnvb.supabase.co
```

## �️ Fallback Safety

Even if environment variables aren't set, the app will fall back to the hardcoded production values, so it should still work!
