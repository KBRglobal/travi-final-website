# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (bcrypt, sharp)
RUN apk add --no-cache python3 make g++ vips-dev

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && npm rebuild bcrypt sharp

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Runtime dependencies for native modules
RUN apk add --no-cache vips

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm rebuild bcrypt

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
