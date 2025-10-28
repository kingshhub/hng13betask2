FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-slim AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist

RUN mkdir -p cache

COPY --from=builder /app/package.json .

EXPOSE 3000

CMD [ "npm", "start" ]
