// Keep-alive service to prevent Render free tier from sleeping
// This will ping your own server every 14 minutes to keep it awake

class KeepAliveService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
    // Ping every 5 minutes (300000 ms) - more frequent to ensure server stays awake
    this.pingInterval = 5 * 60 * 1000;
  }

  start() {
    if (this.isRunning) {
      console.log('KeepAlive service is already running');
      return;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Only run keep-alive in production (when deployed to Render)
    if (siteUrl.includes('localhost')) {
      console.log('KeepAlive service disabled for local development');
      return;
    }

    this.isRunning = true;
    console.log('🔄 KeepAlive service started - pinging every 5 minutes');

    this.interval = setInterval(async () => {
      try {
        const response = await fetch(`${siteUrl}/health`);
        const data = await response.json();
        console.log(`✅ KeepAlive ping successful at ${new Date().toISOString()}`, {
          status: data.status,
          uptime: Math.floor(data.uptime / 60) + ' minutes'
        });
      } catch (error) {
        console.error('❌ KeepAlive ping failed:', error.message);
      }
    }, this.pingInterval);

    // Initial ping after 5 seconds
    setTimeout(() => {
      this.ping();
    }, 5000);
  }

  async ping() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    try {
      const response = await fetch(`${siteUrl}/health`);
      const data = await response.json();
      console.log(`🏓 Initial KeepAlive ping: ${data.status}`);
    } catch (error) {
      console.error('❌ Initial KeepAlive ping failed:', error.message);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      console.log('🛑 KeepAlive service stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pingInterval: this.pingInterval,
      nextPingIn: this.isRunning ? 
        Math.ceil((this.pingInterval - (Date.now() % this.pingInterval)) / 1000) + ' seconds' : 
        'Not running'
    };
  }
}

// Create singleton instance
const keepAliveService = new KeepAliveService();

export default keepAliveService;
