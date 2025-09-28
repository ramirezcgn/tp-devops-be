FROM node:22

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

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

CMD [ "npm", "start" ]
