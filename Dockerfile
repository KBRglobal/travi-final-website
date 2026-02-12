# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt, sharp)
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json ./

# --ignore-scripts skips husky prepare hook
# Then install node-gyp locally so sharp can build from source
RUN npm pkg delete scripts.prepare && \
    npm ci --ignore-scripts && \
    npm install --no-save node-gyp && \
    npm rebuild bcrypt sharp

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Build tools for native modules + vips-dev for sharp compilation
RUN apk add --no-cache vips-dev python3 make g++

COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare && \
    npm ci --omit=dev --ignore-scripts && \
    npm install --no-save node-gyp && \
    npm rebuild bcrypt sharp && \
    apk del python3 make g++ vips-dev && \
    apk add --no-cache vips

COPY --from=builder /app/dist ./dist

# Create writable directories for the non-root user
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# Run as non-root user for security (node user is provided by the base image)
USER node

EXPOSE 5000

CMD ["node", "--max-old-space-size=4096", "dist/index.cjs"]
