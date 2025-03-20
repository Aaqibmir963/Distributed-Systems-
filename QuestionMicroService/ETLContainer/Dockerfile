FROM node:alpine

WORKDIR /usr/app

# Copy package-lock.json and package.json to /usr/app
COPY ./package*.json . 

# install dependent node packages in the container. i.e. node_modules
RUN npm install     

# .dockerignore will avoid overwriting the installed packages with those in the current dir
COPY . .

# Execute the entry point from the command shell
CMD ["node", "app.js"]