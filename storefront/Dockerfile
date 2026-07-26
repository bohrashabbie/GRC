FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_USE_LIVE_CATALOG=true
ARG NEXT_PUBLIC_USE_FIXTURES=true
# These two must exist at BUILD time, not just at runtime. With
# CATALOG_REVALIDATE_SECONDS=0 the catalogue fetches become no-store, which
# opts the routes out of static prerendering — otherwise Next renders them here,
# in a container with no API, and bakes the fixtures into the shipped HTML.
# CATALOG_FALLBACK=false makes that failure loud instead of silent if it ever
# happens again.
ARG CATALOG_REVALIDATE_SECONDS=0
ARG CATALOG_FALLBACK=false
ENV NEXT_PUBLIC_USE_LIVE_CATALOG=$NEXT_PUBLIC_USE_LIVE_CATALOG \
    NEXT_PUBLIC_USE_FIXTURES=$NEXT_PUBLIC_USE_FIXTURES \
    CATALOG_REVALIDATE_SECONDS=$CATALOG_REVALIDATE_SECONDS \
    CATALOG_FALLBACK=$CATALOG_FALLBACK
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3100
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3100
CMD ["node", "server.js"]
