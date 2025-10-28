FROM node:latest AS build

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build --if-present

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html/build

EXPOSE 80

CMD ["nginx","-g","daemon off;"]