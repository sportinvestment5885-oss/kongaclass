FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY lib ./lib
COPY routes ./routes
COPY public ./public
COPY docker-entrypoint.sh ./

RUN mkdir -p /app/data \
  && chmod +x /app/docker-entrypoint.sh \
  && chown -R node:node /app

ENV PORT=5050
ENV DB_PATH=/app/data/bookings.json
ENV HOST=0.0.0.0
EXPOSE 5050

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
