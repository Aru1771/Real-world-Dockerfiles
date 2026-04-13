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


---------------
The Structure
---------------
->  node -e: The -e flag stands for execute. It tells Node.js to run the string of code that follows immediately in the terminal, without needing a separate JavaScript file.

-> require('http').get(...): This uses the built-in Node.js HTTP module to send a GET request to your own server at http://localhost:3000.

-> Success Check: r => process.exit(r.statusCode === 200 ? 0 : 1)

-> If the server responds with a 200 OK status, the process exits with code 0 (which tells Docker "I am healthy").

-> If the server responds with anything else (like a 500 error), it exits with code 1 ("I am unhealthy").

-> Error Handling: .on('error', () => process.exit(1))

-> If the server isn't even running or the port is blocked, the request will "error out." This catch-all ensures the health check fails (exit 1) if the connection is refused.
-----------------------------------------------------------------------------------------------------------------------------------------------------

✅ Add Graceful Shutdown in Node.js App

Update your server.js (or main file):

🐳 Why This Is Important

Without this:

❌ Requests may get killed
❌ Data loss possible
❌ Bad for production

With this:

✅ Clean shutdown
✅ No request loss
✅ Kubernetes friendly

🔥 How It Works in Real World

When you run:

docker stop <container>

Docker sends:

SIGTERM

Your app handles it properly 👍

🧪 Test It

Run container:

docker run -p 3000:3000 your-image

Then stop:

docker stop <container_id>

You should see logs:

Shutdown signal received...
All connections closed. Exiting...

