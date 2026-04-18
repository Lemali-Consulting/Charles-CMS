FROM node:22-slim AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS litestream
ARG LITESTREAM_VERSION=0.5.11
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) suffix=linux-x86_64.tar.gz ;; \
      arm64) suffix=linux-arm64.tar.gz ;; \
      *) echo "unsupported arch: $arch" >&2; exit 1 ;; \
    esac; \
    wget -O /tmp/litestream.tar.gz "https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-${suffix}"; \
    tar -xzf /tmp/litestream.tar.gz -C /usr/local/bin litestream; \
    chmod +x /usr/local/bin/litestream

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Next.js standalone omits instrumentation.js; copy it (and its chunks) so Sentry initializes.
COPY --from=builder --chown=nextjs:nodejs /app/.next/server/instrumentation.js ./.next/server/instrumentation.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/server/chunks ./.next/server/chunks
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=litestream /usr/local/bin/litestream /usr/local/bin/litestream
COPY --chown=nextjs:nodejs litestream.yml /etc/litestream.yml

RUN mkdir -p /data && chown nextjs:nodejs /data
RUN chmod +x ./scripts/entrypoint.sh

USER nextjs
ENV DB_DIR=/data
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["./scripts/entrypoint.sh"]
