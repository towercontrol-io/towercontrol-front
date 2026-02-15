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
  else npm run generate; \
  fi


# ---------- Runtime (no Node) ----------
FROM nginx:alpine AS runtime

# Optionnel: config SPA (fallback sur index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le site statique
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80