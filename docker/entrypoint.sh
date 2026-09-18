#!/bin/sh
# Aplica las migraciones pendientes antes de levantar la aplicación. Es
# idempotente: si la base ya está al día, no hace nada.
set -e

echo "[mesa] Aplicando migraciones de base de datos…"
node node_modules/prisma/build/index.js migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "[mesa] Cargando datos iniciales (áreas, categorías y acuerdos de tiempo)…"
  node node_modules/tsx/dist/cli.mjs prisma/seed.ts
fi

echo "[mesa] Iniciando la mesa de ayuda…"
exec "$@"
