FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
# RUN npm ci --only=production
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "src/app.js"]
