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

# Runtime: vips for sharp, build tools for bcrypt compile
RUN apk add --no-cache vips python3 make g++

COPY package.json package-lock.json ./
RUN npm pkg delete scripts.prepare && \
    npm ci --omit=dev --ignore-scripts && \
    npm install --no-save node-gyp && \
    npm rebuild bcrypt && \
    apk del python3 make g++

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
