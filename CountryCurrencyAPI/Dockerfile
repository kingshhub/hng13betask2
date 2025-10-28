FROM node:20-slim AS builder

WORKDIR /app/CountryCurrencyAPI

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20-slim AS production

WORKDIR /app/CountryCurrencyAPI

COPY --from=builder /app/CountryCurrencyAPI/node_modules ./node_modules

COPY --from=builder /app/CountryCurrencyAPI/dist ./dist

RUN mkdir -p cache

COPY --from=builder /app/CountryCurrencyAPI/package.json .

EXPOSE 3000

CMD [ "npm", "start" ]
