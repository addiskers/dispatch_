# Backend Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose the backend port
EXPOSE 5000

CMD ["node", "server.js"]
