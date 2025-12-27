# Estágio 1: Build
FROM node:20-alpine AS build

# Instalar dependências necessárias para o Prisma no Alpine
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instala todas as dependências (incluindo as de desenvolvimento)
RUN npm install

COPY . .

# Gera o cliente do Prisma (essencial para o NestJS falar com o MongoDB)
RUN npx prisma generate
RUN npm run build

# Estágio 2: Produção
FROM node:20-alpine

# Dependências de runtime
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Define o ambiente como produção
ENV NODE_ENV=production

# Copiamos apenas o necessário do estágio de build
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

# Expor a porta da tua API
EXPOSE 3001

# Comando para rodar a aplicação
CMD ["node", "dist/main"]