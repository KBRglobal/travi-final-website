# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Disable husky git hooks in CI/Docker
ENV HUSKY=0

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000
ENV HUSKY=0

# Runtime dependencies for bcrypt
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && \
    apk del python3 make g++

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
