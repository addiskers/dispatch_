# Use Node.js as the base image for building
FROM node:18 AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the React app for production
RUN npm run build

# Use a lightweight web server to serve the built app
FROM nginx:alpine

# Copy the build output to the web server directory
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
