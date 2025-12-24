# Estágio de Build
FROM node:20-alpine AS build

# INSTALAR DEPENDÊNCIAS DO SISTEMA (OpenSSL e libc)
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# Estágio de Produção
FROM node:20-alpine

# INSTALAR DEPENDÊNCIAS NO RUNTIME TAMBÉM
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]