FROM node:22 AS builder

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Bundle app source
COPY . .

# Compile TypeScript to JavaScript using production config
RUN npx tsc -p tsconfig.production.json

# Production stage
FROM node:22

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Remove "type": "module" from package.json for CommonJS compiled code
RUN npm pkg delete type

# Install production dependencies only
RUN npm ci --only=production

# Copy compiled JavaScript from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/loader.js ./loader.js

# Default environment variables (can be overridden by docker-compose)
ENV PORT=3001
ENV DB_HOST=devops_db
ENV DB_PORT=5432
ENV DB_USER=devuser
ENV DB_PASS=devpass
ENV DB_NAME=devops
ENV REDIS_HOST=devops_redis
ENV REDIS_PORT=6379

EXPOSE 3001

CMD [ "node", "dist/src/server.js" ]
