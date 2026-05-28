# 使用 Node 的 Debian 版本作为基础镜像（比 Alpine 兼容 Python 编译更好）
FROM node:18-bullseye

# 设置工作目录
WORKDIR /app

# 安装 Python3, pip 以及构建 curl_cffi 可能需要的依赖
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 先复制 package.json 安装 Node 依赖
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# 复制 Python 的 requirements.txt 并安装
COPY scripts/requirements.txt ./scripts/
RUN pip3 install --no-cache-dir -r scripts/requirements.txt

# 复制其余源代码
COPY . .

# 构建 NestJS 项目
RUN pnpm run build

# 启动命令
CMD ["pnpm", "run", "start:prod"]