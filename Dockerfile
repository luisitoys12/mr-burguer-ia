FROM node:22-alpine AS base

WORKDIR /app

# Dependencias
COPY package*.json ./
RUN npm ci --omit=dev

# Código fuente
COPY src/ ./src/
COPY drizzle.config.js ./

EXPOSE 3000

CMD ["node", "src/index.js"]
