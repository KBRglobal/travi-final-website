# ============================================
# TRAVI Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 travi

# Copy necessary files from builder
COPY --from=builder --chown=travi:nodejs /app/dist ./dist
COPY --from=builder --chown=travi:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=travi:nodejs /app/package.json ./package.json
COPY --from=builder --chown=travi:nodejs /app/migrations ./migrations

# Create directories for logs and uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R travi:nodejs /app/logs /app/uploads

# Switch to non-root user
USER travi

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health/live || exit 1

# Start the application
CMD ["node", "dist/index.cjs"]
