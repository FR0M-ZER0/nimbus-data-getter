FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./


RUN npm ci


COPY . .


RUN npx prisma generate


RUN npm run build --if-present


FROM node:20-alpine AS production

WORKDIR /app


COPY package.json package-lock.json ./


RUN npm ci --omit=dev


COPY --from=builder /app .


EXPOSE 8080

CMD [ "npm", "run", "start" ]
