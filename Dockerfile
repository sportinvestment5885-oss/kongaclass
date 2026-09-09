FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY server.js ./
COPY lib ./lib
COPY routes ./routes
COPY public ./public

RUN mkdir -p /app/data && chown -R node:node /app/data

ENV PORT=5050
ENV DB_PATH=/app/data/bookings.db
EXPOSE 5050

USER node

CMD ["node", "server.js"]
