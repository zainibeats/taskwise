FROM node:20-alpine

# Install dependencies required for better-sqlite3 and bcrypt
RUN apk add --no-cache python3 make g++ gcc libc-dev sqlite sqlite-dev

# Set working directory
WORKDIR /app

# Create data directories with proper permissions
RUN mkdir -p /app/data /app/logs && chmod 777 /app/data /app/logs

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://localhost:3100

# Build the application
RUN npm run build

# Expose ports
EXPOSE 9002 3100

# Create volume for data persistence
VOLUME ["/app/data"]

# Start both the database service and the Next.js application
CMD ["npm", "run", "start:with-db"] 