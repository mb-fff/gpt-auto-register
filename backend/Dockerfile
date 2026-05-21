FROM node:20-alpine

WORKDIR /app

ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

RUN apk add --no-cache openssl libc6-compat \
  && npm install -g pnpm@8.15.5 --registry=https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml ./
RUN pnpm config set registry https://registry.npmmirror.com \
  && pnpm install --frozen-lockfile --ignore-scripts

COPY prisma ./prisma

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm run dev"]
