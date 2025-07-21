# Step 1: Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies with legacy peer support
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app source code and build
COPY . .

# Skip ESLint errors during build
ENV NEXT_PUBLIC_IGNORE_ESLINT=true

RUN npm run build

# Step 2: Run Stage (production server)
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only the built app and node_modules
COPY --from=builder /app ./

# Expose the port Next.js listens on
EXPOSE 3000

# Start the app in production mode
CMD ["npm", "start"]
