# Use Node 22 image
FROM node:22

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies using npm ci (ensure consistent versions)
RUN npm ci --legacy-peer-deps

# Copy the rest of the frontend project files
COPY . .

# Expose the port
EXPOSE 4006

# Start the frontend development server with proper host binding
CMD ["npm", "run", "dev"]
