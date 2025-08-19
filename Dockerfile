# Multi-stage build for production
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments for Vite environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set environment variables for the build process
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine as production

# Install curl for health checks
RUN apk add --no-cache curl

# Set default environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for security first
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nextjs -u 1001 -G nodejs

# Create app directory and set ownership
WORKDIR /app
RUN chown nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Copy built application from builder stage with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Copy server file with correct ownership
COPY --chown=nextjs:nodejs server.js ./

# Install production dependencies
RUN npm ci --omit=dev --cache /tmp/.npm

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "server.js"]
