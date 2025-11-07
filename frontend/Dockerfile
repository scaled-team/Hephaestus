# Frontend Build Stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Frontend Development/Production Server
FROM node:20-alpine

WORKDIR /app

# Install pnpm for faster package management (optional but recommended)
RUN npm install -g vite

# Copy package files
COPY package*.json ./

# Install dependencies (production + dev for dev server)
RUN npm ci

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5173', (r) => {if (r.statusCode !== 404) throw new Error(r.statusCode)})"

# Default command - run dev server
CMD ["npm", "run", "dev"]
