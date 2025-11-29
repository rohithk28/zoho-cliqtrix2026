FROM node:18

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy backend source code
COPY ./source ./source

# Copy database migrations folder
COPY ./database ./database

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "source/server.js"]
