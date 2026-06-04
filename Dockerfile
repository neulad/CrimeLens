FROM oven/bun:1-alpine

WORKDIR /app

# Install deps first (cached layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

EXPOSE 3000

# Run migrations then start the server
CMD sh -c "bun run db:migrate && bun run src/app.ts"
