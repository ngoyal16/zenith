FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose ports for Next.js (3000) and Vinext (3001)
EXPOSE 3000
EXPOSE 3001

# Run the Vinext dev server
CMD ["npm", "run", "dev:vinext", "--", "--host", "0.0.0.0"]
