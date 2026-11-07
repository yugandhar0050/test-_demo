
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY certs/global-bundle.pem ./certs/global-bundle.pem

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_SSL_CA_PATH=/app/certs/global-bundle.pem

EXPOSE 5000

CMD ["npm", "start"]

