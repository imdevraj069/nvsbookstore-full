FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY src ./src

EXPOSE 3002

CMD ["node", "src/index.js"]
