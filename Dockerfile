# Use Node.js 18 for better compatibility with native modules
FROM node:22-alpine

# Install dependencies required for better-sqlite3 and bcrypt
RUN apk update && apk upgrade --no-cache && apk add --no-cache python3 make g++ gcc libc-dev sqlite sqlite-dev

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=/api

# Ensure data directory exists and has correct permissions
RUN mkdir -p /app/data /app/logs && \
    chmod -R 755 /app/data /app/logs

# Build the application
RUN npm run build

# Expose ports
EXPOSE 9002 3100

# Create volume for data persistence
VOLUME ["/app/data", "/app/logs"]

# Start both the database service and the Next.js application
CMD ["npm", "run", "start:with-db"] 