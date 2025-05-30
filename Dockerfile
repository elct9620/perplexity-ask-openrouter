FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the project
RUN npm install -g pnpm && \
    pnpm build

# Production image, copy all the files and run the server
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose the port the app runs on
EXPOSE 3000

# Run the application
CMD ["node", "dist/index.js"]
