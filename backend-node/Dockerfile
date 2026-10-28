FROM node:18-alpine

# 1. Instalar OpenSSL e dependências de compatibilidade do Alpine (Crucial para o Prisma)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# 2. Copiar os ficheiros de dependências
COPY package*.json ./
COPY prisma ./prisma/

# 3. Instalar todas as dependências (necessário para o build/prisma)
RUN npm install

# 4. Gerar o cliente Prisma com o OpenSSL já instalado no sistema
RUN npx prisma generate

# 5. Copiar o restante do código fonte
COPY . .

EXPOSE 4000
CMD ["node", "src/server.js"]