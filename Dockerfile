# Imagen de la mesa de ayuda. Build multietapa: dependencias, compilación y
# una imagen final mínima que aplica migraciones y arranca el servidor.
#
# Redes con inspección TLS: si la empresa intercepta el tráfico HTTPS con su
# propio certificado, los contenedores no confían en él y fallan al descargar
# paquetes ("TLS: server certificate not trusted"). Para resolverlo, deja el
# certificado raíz de la empresa en docker/certs/ (ver docs/despliegue.md);
# cada etapa lo agrega al almacén de confianza. Si la carpeta está vacía, no
# pasa nada: la construcción sigue igual.

FROM node:22-alpine AS deps
WORKDIR /app
COPY docker/certs/ /usr/local/share/ca-certificates/
RUN cat /usr/local/share/ca-certificates/*.crt >> /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
COPY package.json package-lock.json .npmrc ./
# Si la instalación falla, se muestra el registro de npm: su mensaje de error
# ("Exit handler never called!") no dice nada por sí solo.
RUN npm ci || (tail -n 60 /root/.npm/_logs/*.log; exit 1)

FROM node:22-alpine AS builder
WORKDIR /app
COPY docker/certs/ /usr/local/share/ca-certificates/
RUN cat /usr/local/share/ca-certificates/*.crt >> /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Dependencias de ejecución (incluyen prisma y tsx para migrar y sembrar datos).
FROM node:22-alpine AS proddeps
WORKDIR /app
COPY docker/certs/ /usr/local/share/ca-certificates/
RUN cat /usr/local/share/ca-certificates/*.crt >> /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci --omit=dev || (tail -n 60 /root/.npm/_logs/*.log; exit 1)

FROM node:22-alpine AS runner
WORKDIR /app
# La aplicación habla con Entra ID por HTTPS: necesita el mismo almacén.
COPY docker/certs/ /usr/local/share/ca-certificates/
RUN cat /usr/local/share/ca-certificates/*.crt >> /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
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
