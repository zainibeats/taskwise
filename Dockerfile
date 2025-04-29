FROM node:20-alpine

# Install dependencies required for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc libc-dev sqlite

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data && chmod 777 /app/data

# Create a directory for logs
RUN mkdir -p /app/logs && chmod 777 /app/logs

# Copy package files first to leverage Docker caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create required directories and set permissions
RUN mkdir -p /app/data /app/logs && chmod 777 /app/data /app/logs

# Define build argument for API URL
# This must be passed in docker-compose.yml or docker build command
ARG NEXT_PUBLIC_API_URL=http://localhost:3100
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the application
# The NEXT_PUBLIC_* variables are embedded during this step
RUN npm run build

# Expose both app port and database service port
EXPOSE 3000 3100

# Set environment variables
ENV NODE_ENV=production
# NEXT_PUBLIC_API_URL is now handled via ARG/ENV above

# Add volume for persistent data
VOLUME ["/app/data"]

# Start both the database service and the Next.js application
CMD ["sh", "-c", "node db/connection.js & npm start"]
