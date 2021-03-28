FROM node:10 
#Tried using the lighter alpine version, but I couldn't find how to install serial.h

WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY src/ src/

CMD [ "npm", "start" ]