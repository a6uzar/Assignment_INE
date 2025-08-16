# Deployment Guide for Render.com

## 🚀 Deploying LiveBid Auction Platform to Render.com

This guide will help you deploy your auction platform to Render.com using Docker and GitHub Actions CI/CD.

### Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **Render.com Account**: Sign up at [render.com](https://render.com)
3. **Supabase Project**: Your Supabase project should be set up and running

### Step 1: Prepare Your Repository

Your repository now includes:
- ✅ `Dockerfile` - Single container for both frontend and backend
- ✅ `.dockerignore` - Optimized build context
- ✅ `render.yaml` - Render.com configuration
- ✅ `.github/workflows/deploy.yml` - GitHub Actions CI/CD

### Step 2: Set Up Render.com Service

1. **Log in to Render.com**
2. **Create a New Web Service**:
   - Click "New" → "Web Service"
   - Connect your GitHub repository: `https://github.com/a6uzar/Assignment_INE`
   - Choose your repository and branch (`main` or `master`)

3. **Configure the Service**:
   - **Name**: `live-bid-dash`
   - **Region**: Oregon (or your preferred region)
   - **Branch**: `main` (or `master`)
   - **Build Command**: Leave empty (Docker handles this)
   - **Start Command**: `node server.js`

4. **Environment Variables**:
   Add these environment variables in Render:
   ```
   NODE_ENV=production
   PORT=3000
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

### Step 3: Configure GitHub Actions (Optional but Recommended)

1. **GitHub Secrets**:
   Go to your GitHub repository → Settings → Secrets and Variables → Actions
   
   Add these secrets:
   ```
   RENDER_SERVICE_ID=your_render_service_id
   RENDER_API_KEY=your_render_api_key
   ```

2. **Get Render API Key**:
   - Go to Render Dashboard → Account Settings → API Keys
   - Create a new API key and copy it

3. **Get Service ID**:
   - From your Render service URL: `https://dashboard.render.com/web/srv-xxxxx`
   - The `srv-xxxxx` part is your service ID

### Step 4: Deploy

#### Manual Deployment:
1. Push your code to GitHub
2. Render will automatically detect the push and deploy

#### Automatic CI/CD:
- Every push to `main`/`master` will trigger GitHub Actions
- Actions will test, build, and deploy automatically

### Step 5: Verify Deployment

1. **Check Build Logs**: Monitor the deployment in Render dashboard
2. **Test the Application**: Visit your Render URL (e.g., `https://live-bid-dash.onrender.com`)
3. **Verify Features**:
   - ✅ Homepage loads correctly
   - ✅ Authentication works
   - ✅ Auction listings display
   - ✅ Real-time bidding functions
   - ✅ Admin dashboard accessible

### Troubleshooting

#### Common Issues:

1. **Build Fails**:
   ```bash
   # Test locally first
   docker build -t live-bid-dash .
   docker run -p 3000:3000 live-bid-dash
   ```

2. **Environment Variables**:
   - Ensure all Supabase URLs are correct
   - Check that environment variables are set in Render

3. **Static Files Not Loading**:
   - Verify the build output in `dist/` folder
   - Check that Express is serving static files correctly

#### Logs and Monitoring:
- View logs in Render Dashboard → Your Service → Logs
- Monitor performance in the Metrics tab
- Set up alerts for downtime

### Production Optimization

1. **Performance**:
   - Enable gzip compression
   - Set up CDN for static assets
   - Monitor memory usage

2. **Security**:
   - Use HTTPS (enabled by default on Render)
   - Set up proper CORS headers
   - Implement rate limiting

3. **Scaling**:
   - Render auto-scales based on traffic
   - Monitor usage in dashboard
   - Upgrade plan if needed

### Custom Domain (Optional)

1. **Add Custom Domain** in Render:
   - Go to Service → Settings → Custom Domains
   - Add your domain (e.g., `auction.yoursite.com`)
   - Configure DNS records as instructed

### Maintenance

- **Updates**: Push to GitHub to trigger automatic deployment
- **Rollbacks**: Use Render dashboard to rollback to previous versions
- **Monitoring**: Set up health checks and alerts

## 🎉 Success!

Your LiveBid auction platform is now live on Render.com with:
- ✅ Dockerized deployment
- ✅ GitHub Actions CI/CD
- ✅ Auto-scaling infrastructure
- ✅ Production-ready configuration

Visit your deployment URL and start auctioning! 🏆
