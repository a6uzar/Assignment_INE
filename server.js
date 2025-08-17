import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Simple built-in keep-alive (no external dependencies)
let pingCount = 0;
let lastPingTime = null;
let isKeepAliveRunning = false;

function startSimpleKeepAlive() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // Only run in production
  if (siteUrl.includes('localhost')) {
    console.log('Keep-alive disabled for local development');
    return;
  }

  isKeepAliveRunning = true;
  console.log('🔄 Simple keep-alive started - self-ping every 5 minutes');
  
  setInterval(async () => {
    try {
      const response = await fetch(`${siteUrl}/health`);
      pingCount++;
      lastPingTime = new Date().toISOString();
      console.log(`✅ Self-ping #${pingCount} successful at ${lastPingTime}`);
    } catch (error) {
      console.error('❌ Self-ping failed:', error.message);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    keepAlive: {
      isRunning: isKeepAliveRunning,
      pingCount: pingCount,
      lastPingTime: lastPingTime
    }
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Live Bid Dash API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    keepAlive: {
      isRunning: isKeepAliveRunning,
      pingCount: pingCount,
      lastPingTime: lastPingTime
    }
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Catch all handler - MUST be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start keep-alive service
  startSimpleKeepAlive();
});
