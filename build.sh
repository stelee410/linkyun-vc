#!/usr/bin/env bash
# =============================================================================
# Linkyun-VC 本地构建脚本
# 从 .env.local 读取环境变量，本地编译，打成 zip 放到 dist/
# 用法: ./build.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"
DIST_DIR="$SCRIPT_DIR/dist"
VITE_OUT="$SCRIPT_DIR/dist-vite"
ZIP_NAME="linkyun-vc.zip"

# ---------- 颜色 ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==> Linkyun-VC 构建${NC}"

# ---------- 检查 .env.local ----------
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}错误: 未找到 $ENV_FILE，请先创建或执行 ./setup.sh${NC}"
  exit 1
fi

# ---------- 读取并导出 .env.local 中所有非注释变量 ----------
echo "==> 读取 .env.local ..."
while IFS= read -r line || [[ -n "$line" ]]; do
  # 跳过空行和注释
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  # 去掉行尾注释，去掉首尾空白
  clean="${line%%#*}"
  clean="${clean#"${clean%%[![:space:]]*}"}"
  clean="${clean%"${clean##*[![:space:]]}"}"
  [[ -z "$clean" ]] && continue
  # 分离 key 和 value，去掉 value 两边的引号
  key="${clean%%=*}"
  val="${clean#*=}"
  if [[ "$val" =~ ^\"(.*)\"$ ]]; then
    val="${BASH_REMATCH[1]}"
  elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
    val="${BASH_REMATCH[1]}"
  fi
  export "$key=$val" 2>/dev/null || true
done < "$ENV_FILE"

# 打印关键变量（脱敏 token）
echo "    VITE_API_BASE_URL       = ${VITE_API_BASE_URL:-（未设置）}"
echo "    VITE_WORKSPACE_CODE     = ${VITE_WORKSPACE_CODE:-（未设置）}"
echo "    VITE_SITE_THEME         = ${VITE_SITE_THEME:-（未设置）}"
echo "    VITE_DOUBAO_ASR_APP_ID  = ${VITE_DOUBAO_ASR_APP_ID:-（未设置）}"
echo ""

# ---------- npm 编译 ----------
echo "==> 安装依赖并编译 ..."
cd "$SCRIPT_DIR"
npm install --silent
npm run build

# Vite 默认输出到 dist/，暂存到 dist-vite/
rm -rf "$VITE_OUT"
mv "$SCRIPT_DIR/dist" "$VITE_OUT"

# ---------- 生成精简 Dockerfile（不在服务端跑 npm，只复制预编译文件） ----------
STAGING="$SCRIPT_DIR/_staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

cat > "$STAGING/Dockerfile" << 'DOCKERFILE'
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE

# ---------- 生成 docker-compose.yml（从 .env.local 读取容器名和端口） ----------
CONTAINER_NAME="${VITE_WORKSPACE_CODE:-linkyun-vc}-frontend"
HOST_PORT="${DEPLOY_HOST_PORT:-3000}"

cat > "$STAGING/docker-compose.yml" << COMPOSE
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: $CONTAINER_NAME
    ports:
      - "$HOST_PORT:80"
    restart: unless-stopped
COMPOSE

# ---------- 组装打包目录 ----------
cp "$SCRIPT_DIR/nginx.conf" "$STAGING/nginx.conf"
cp -r "$VITE_OUT" "$STAGING/dist"

echo "    容器名: $CONTAINER_NAME"
echo "    端口映射: $HOST_PORT → 80"

# ---------- 打 zip ----------
mkdir -p "$DIST_DIR"
cd "$STAGING"
zip -r -q "$DIST_DIR/$ZIP_NAME" .
cd "$SCRIPT_DIR"
rm -rf "$STAGING" "$VITE_OUT"

echo ""
echo -e "${GREEN}==> 构建完成${NC}"
echo -e "    产物: ${CYAN}$DIST_DIR/$ZIP_NAME${NC}"
ls -lh "$DIST_DIR/$ZIP_NAME"
echo ""
echo -e "下一步: ${CYAN}./deploy.sh${NC}"
