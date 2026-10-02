FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV DB_SSL_CA=/app/certs/ca.pem

CMD ["npm", "start"]
