FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && apt-get purge -y python3 make g++ \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

COPY server.js ./
COPY lib ./lib
COPY routes ./routes
COPY public ./public
COPY docker-entrypoint.sh ./

RUN mkdir -p /app/data \
  && chmod +x /app/docker-entrypoint.sh \
  && chown -R node:node /app

ENV PORT=5050
ENV DB_PATH=/app/data/bookings.db
ENV HOST=0.0.0.0
EXPOSE 5050

# Entrypoint runs as root so Railway volumes can be chown'd, then drops to node.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
