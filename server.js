import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import keepAliveService from './src/lib/keepAlive.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    keepAlive: keepAliveService.getStatus()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'Live Bid Dash API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    keepAlive: keepAliveService.getStatus()
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
  
  // Start keep-alive service to prevent Render free tier sleep
  keepAliveService.start();
});
