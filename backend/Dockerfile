FROM node:18-bullseye

WORKDIR /app

# 加上 Prisma 的镜像加速（可选，但在国内必须加）
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm config set registry https://registry.npmmirror.com && pnpm install

# ！！！请确保你在 scripts 文件夹下创建了 requirements.txt ！！！
COPY scripts/requirements.txt ./scripts/
RUN pip3 install --no-cache-dir -r scripts/requirements.txt
RUN playwright install chromium
RUN playwright install-deps

COPY . .

# 必须执行 Prisma 生成，否则会报错 PrismaClient 初始化失败
RUN pnpm exec prisma generate

RUN pnpm run build

# 启动命令增加 migrate 以保持和原来一致
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm run start:prod"]