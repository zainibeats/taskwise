FROM node:18-alpine

# Install dependencies required for better-sqlite3
RUN apk add --no-cache python3 make g++ gcc libc-dev

WORKDIR /app

# Create data directory for SQLite
RUN mkdir -p /app/data && chmod 777 /app/data

# Copy package files first to leverage Docker caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Add volume for persistent data
VOLUME ["/app/data"]

CMD ["npm", "start"]
