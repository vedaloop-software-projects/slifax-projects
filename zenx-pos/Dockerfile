# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY zenx-pos-superadmin/package.json zenx-pos-superadmin/package-lock.json ./
RUN npm ci
COPY zenx-pos-superadmin/ ./
RUN npm run build

FROM node:24-bookworm-slim AS backend-build
WORKDIR /build/backend
COPY zenx-pos-backend/package.json zenx-pos-backend/package-lock.json ./
RUN npm ci
COPY zenx-pos-backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
LABEL org.opencontainers.image.source="https://github.com/vedaloop-software-projects/slifax-projects"
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5100 \
    UPLOAD_ROOT=/app/public
WORKDIR /app
COPY --from=backend-build --chown=node:node /build/backend/package.json /build/backend/package-lock.json ./
COPY --from=backend-build --chown=node:node /build/backend/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /build/backend/dist ./dist
COPY --from=backend-build --chown=node:node /build/backend/public ./public
COPY --from=frontend-build --chown=node:node /build/frontend/dist ./public
RUN mkdir -p /app/public/uploads && chown -R node:node /app/public/uploads
USER node
EXPOSE 5100
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5100/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
