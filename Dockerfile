# Estágio 1: Build
FROM node:20-alpine AS build

# Instalar dependências necessárias para o Prisma e compilação no Alpine
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copiar ficheiros de configuração de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala todas as dependências (necessário para o build do NestJS)
RUN npm install

# Copiar o resto do código fonte
COPY . .

# 1. Gera o cliente do Prisma
# 2. Compila o projeto NestJS (Cria a pasta /dist)
RUN npx prisma generate
RUN npm run build

# --- Estágio 2: Produção ---
FROM node:20-alpine

# Dependências mínimas para rodar o motor Prisma e Node em produção
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Define o ambiente como produção para otimizar performance
ENV NODE_ENV=production

# Copiamos apenas o essencial do estágio de build para manter a imagem leve
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma

# O Render atribui uma porta dinâmica, mas internamente usamos a 3001
EXPOSE 3001

# Comando para rodar a aplicação usando o script do package.json
# Isso ajuda o Node a resolver melhor os caminhos da pasta /dist
CMD ["npm", "run", "start:prod"]