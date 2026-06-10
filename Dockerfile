# ============================================
# ELEMENT Cotizador - Dockerfile
# Multi-stage: Build con Node + Serve con Nginx
# ============================================

# ─── Stage 1: Build ─────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Copiar código fuente
COPY . .

# Build de producción (Vite genera dist/)
RUN npm run build

# ─── Stage 2: Runtime (Nginx) ───────────────
FROM nginx:alpine AS runtime

# Instalar utilidades para entrypoint
RUN apk add --no-cache bash jq

# Copiar configuración de nginx
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar script de entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copiar assets construidos desde el builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Crear directorio para env vars dinámicas
RUN mkdir -p /usr/share/nginx/html/env

# Puerto expuesto
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Entrypoint que inyecta variables antes de arrancar nginx
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
