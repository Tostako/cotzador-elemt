#!/bin/bash
# ============================================
# entrypoint.sh - Inyecta variables de entorno
# en tiempo de ejecución para la SPA de Vite
# ============================================

set -e

# Variables configurables via docker run -e
API_URL="${API_URL:-http://localhost:3001/api/v1}"
SHOP_SLUG="${SHOP_SLUG:-elemet-haus}"

# Generar env.json para lectura dinámica
mkdir -p /usr/share/nginx/html/env

cat > /usr/share/nginx/html/env/env.json <<EOF
{
  "VITE_API_URL": "${API_URL}",
  "VITE_SHOP_SLUG": "${SHOP_SLUG}"
}
EOF

echo "[entrypoint] Environment injected:"
echo "  API_URL=${API_URL}"
echo "  SHOP_SLUG=${SHOP_SLUG}"

# Inyectar script de carga de env en index.html si no existe
if ! grep -q "window.__ENV" /usr/share/nginx/html/index.html; then
  # Crear backup
  cp /usr/share/nginx/html/index.html /usr/share/nginx/html/index.html.bak

  # Insertar script justo antes de </head>
  sed -i 's|</head>|<script>fetch("/env/env.json").then(r=>r.json()).then(e=>window.__ENV=e).catch(()=>window.__ENV={})</script></head>|g' /usr/share/nginx/html/index.html
fi

# Ejecutar el comando principal (nginx)
exec "$@"
