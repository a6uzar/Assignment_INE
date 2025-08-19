#!/bin/bash

# Deployment optimization script for Render
echo "🚀 Starting deployment optimization..."

# 1. Clean up node modules and reinstall with production flags
echo "📦 Cleaning and optimizing dependencies..."
rm -rf node_modules package-lock.json
npm install --production --no-optional --no-audit --no-fund

# 2. Build with optimizations
echo "🏗️ Building application with optimizations..."
NODE_ENV=production npm run build

# 3. Remove development dependencies
echo "🧹 Removing development dependencies..."
npm prune --production

# 4. Show final bundle sizes
echo "📊 Final bundle analysis:"
ls -lah dist/assets/

echo "✅ Deployment optimization complete!"
