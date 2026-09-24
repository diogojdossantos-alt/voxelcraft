# Imagem unica: o mesmo processo serve o jogo e o multijogador.
# Funciona em Render, Fly.io, Railway ou qualquer lugar que rode container.

FROM node:22-alpine AS build
WORKDIR /app

# Manifestos primeiro: enquanto eles nao mudam, a camada de dependencias fica
# em cache e o build seguinte e bem mais rapido.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Cliente (dist/) e servidor (server.js) em um passo so.
RUN npm run build && npm run build:server

# ---

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Nada de node_modules: o servidor vai empacotado com express e ws dentro.
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

# A hospedagem define a PORT; 3000 e so o padrao.
ENV PORT=3000
EXPOSE 3000

# Nao roda como root.
USER node

CMD ["node", "server.js"]
