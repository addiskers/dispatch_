# Use an official Node.js image with Alpine Linux for lightweight builds
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy only package.json and package-lock.json to leverage Docker caching
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Expose the backend port
EXPOSE 5000

# Run the server
CMD ["node", "server.js"]
