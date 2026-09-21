# Imagen de la mesa de ayuda. Build multietapa: dependencias, compilación y
# una imagen final mínima que aplica migraciones y arranca el servidor.

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Dependencias de ejecución (incluyen prisma y tsx para migrar y sembrar datos).
FROM node:22-alpine AS proddeps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S mesa && adduser -S mesa -G mesa

COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
# Se normalizan los finales de línea por si el archivo se clonó en Windows.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
  && chmod +x /usr/local/bin/entrypoint.sh \
  && chown -R mesa:mesa /app

USER mesa
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
