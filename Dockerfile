FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY lib ./lib
COPY routes ./routes
COPY public ./public

RUN mkdir -p /app/data && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/app/data/bookings.json
ENV HOST=0.0.0.0
EXPOSE 8080

USER node

CMD ["node", "server.js"]
