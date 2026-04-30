# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from front/src/ (the actual npm root)
COPY src/package.json src/package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Build context is front/, source code is in front/src/
COPY src/ ./

# Build the production bundle
RUN npm run build

# ── Stage 2: Serve ──
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
# Vite outputs to ./dist by default
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]