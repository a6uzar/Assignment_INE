// Enhanced Keep-alive service with better logging and external cron support
import fetch from 'node-fetch';

class KeepAliveService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
    this.pingInterval = 5 * 60 * 1000; // 5 minutes
    this.pingCount = 0;
    this.lastPingTime = null;
    this.failureCount = 0;
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
    console.log(`🔄 KeepAlive service started - pinging ${siteUrl}/health every 5 minutes`);

    this.interval = setInterval(async () => {
      await this.ping();
    }, this.pingInterval);

    // Initial ping after 10 seconds
    setTimeout(() => {
      this.ping();
    }, 10000);
  }

  async ping() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const startTime = Date.now();
    
    try {
      console.log(`🏓 Sending KeepAlive ping #${this.pingCount + 1} at ${new Date().toISOString()}`);
      
      const response = await fetch(`${siteUrl}/health`, {
        method: 'GET',
        headers: {
          'User-Agent': 'KeepAlive-Service/1.0'
        },
        timeout: 30000 // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      this.pingCount++;
      this.lastPingTime = new Date().toISOString();
      this.failureCount = 0; // Reset failure count on success
      
      console.log(`✅ KeepAlive ping #${this.pingCount} successful (${responseTime}ms)`, {
        status: data.status,
        uptime: Math.floor(data.uptime / 60) + ' minutes',
        timestamp: this.lastPingTime
      });

    } catch (error) {
      this.failureCount++;
      console.error(`❌ KeepAlive ping #${this.pingCount + 1} failed (${this.failureCount} failures):`, {
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime + 'ms'
      });
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
