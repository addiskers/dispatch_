FROM node:20-alpine
WORKDIR /app

# Explicitly copy package files first
COPY package*.json ./

# Clear npm cache and install dependencies
RUN npm ci

# Copy application code after dependencies
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]