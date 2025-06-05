# Use official Node.js 18 image based on Alpine Linux
FROM node:18-alpine3.17

# Set the working directory inside the container
WORKDIR /usr/app

# Copy only package.json and package-lock.json to leverage Docker cache for npm install
COPY package*.json /usr/app/

# Install dependencies defined in package.json
RUN npm install

# Copy the rest of the application source code to the working directory
COPY . .

# Set environment variables for MongoDB connection
ENV MONGO_URI=uriPlaceholder
ENV MONGO_USERNAME=usernamePlaceholder
ENV MONGO_PASSWORD=passwordPlaceholder

# Expose port 3000 to allow access to the app from outside the container
EXPOSE 3000

# Define the command to run the app when the container starts
CMD [ "npm", "start" ]
