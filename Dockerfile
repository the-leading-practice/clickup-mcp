FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist/ ./dist/
COPY package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV CLICKUP_MCP_TRANSPORT=http
ENV PORT=8417

EXPOSE 8417

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8417/health || exit 1

# Run the HTTP server entry point
CMD ["node", "dist/http-server.js"]
