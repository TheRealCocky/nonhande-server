# Estágio 1: Build
FROM node:20-alpine AS build
RUN apk add --no-cache openssl openssl-dev libc6-compat
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Estágio 2: Produção
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

# --- ESTA É A MUDANÇA CRUCIAL ---
# Vamos tentar encontrar o main.js onde quer que ele esteja na dist
CMD ["sh", "-c", "node dist/main.js || node dist/src/main.js"]