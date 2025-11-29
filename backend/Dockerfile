# Base image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy full backend source
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["node", "source/server.js"]
