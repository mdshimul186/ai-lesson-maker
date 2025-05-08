# Use Node 22 image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json /app/

# Remove node_modules only, keep package-lock.json
RUN rm -rf node_modules

# Install dependencies using npm ci (ensure consistent versions)
RUN npm i --include=dev

# Copy the rest of the frontend project files
COPY . /app/

# Start the frontend development server
CMD ["npm", "run", "dev"]
