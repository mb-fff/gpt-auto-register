FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@8.15.5 --registry=https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry https://registry.npmmirror.com \
  && pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0"]
