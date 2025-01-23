# Frontend Dockerfile
FROM node:16-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Serve the app using nginx
FROM nginx:stable-alpine

COPY --from=build /app/build /usr/share/nginx/html

# Expose the frontend port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
    