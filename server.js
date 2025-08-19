import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// Log the port being used for debugging
console.log(`🔧 Starting server on PORT: ${PORT} (from env: ${process.env.PORT ? 'yes' : 'no, using default'})`);

// Add compression and security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the dist directory with caching
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple status endpoint (backup health check)
app.get('/status', (req, res) => {
  res.status(200).send('OK');
});

// API readiness check (for container orchestration)
app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    env: process.env.NODE_ENV || 'not-set',
    port: PORT
  });
});

// Environment info endpoint (for debugging)
app.get('/env-info', (req, res) => {
  res.status(200).json({
    NODE_ENV: process.env.NODE_ENV || 'not-set',
    PORT: process.env.PORT || 'not-set',
    SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'set' : 'not-set',
    SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'not-set',
    // Add other env vars you need to check
    timestamp: new Date().toISOString()
  });
});

// Handle React Router (return `index.html` for all non-API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🏥 Health check available at: http://localhost:${PORT}/health`);
  console.log(`📊 Environment info available at: http://localhost:${PORT}/env-info`);

  // Log environment variables status for debugging
  console.log('\n🔧 Environment Variables Status:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not-set'}`);
  console.log(`   PORT: ${process.env.PORT || 'not-set'}`);
  console.log(`   VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'set' : 'not-set'}`);
  console.log(`   VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? 'set' : 'not-set'}`);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});