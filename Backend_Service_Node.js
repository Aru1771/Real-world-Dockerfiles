# ===============================
# 1️⃣ Build Stage
# ===============================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies separately for better cache usage
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application (for React / Next / TS etc.)
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# ===============================
# 2️⃣ Runtime Stage (Minimal & Secure)
# ===============================
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S appgroup \
 && adduser -S appuser -G appgroup

# Copy only production artifacts
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build

# Fix ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check for container orchestration (K8s / ECS)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start app
CMD ["npm", "start"]

