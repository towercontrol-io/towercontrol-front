# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm ci; \
  fi

COPY . .

# Nuxt static generate -> dist/
RUN \
  if [ -f pnpm-lock.yaml ]; then pnpm generate; \
  elif [ -f yarn.lock ]; then yarn generate; \
  else npm run build; \
  fi


# Stage 3: Production runtime
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nuxt
RUN adduser --system --uid 1001 nuxt

# Copy the Nitro output (self-contained server + client assets)
COPY --from=build --chown=nuxt:nuxt /app/.output ./.output

USER nuxt

EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the Nitro server
CMD ["node", ".output/server/index.mjs"]