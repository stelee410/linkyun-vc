#!/usr/bin/env bash
# =============================================================================
# Linkyun-VC 部署脚本
# 上传 dist/linkyun-vc.zip 到服务器 ~/dist/，解压后执行 docker compose up -d --build
# 用法: ./deploy.sh
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
ZIP_NAME="linkyun-vc.zip"
ZIP_FILE="$DIST_DIR/$ZIP_NAME"
REMOTE_BASE="~/dist"
REMOTE_DIR="$REMOTE_BASE/linkyun-vc"

# ---------- 颜色 ----------
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==> Linkyun-VC 部署${NC}"

# ---------- 检查 zip ----------
if [[ ! -f "$ZIP_FILE" ]]; then
  echo -e "${RED}错误: 未找到 $ZIP_FILE${NC}"
  echo "请先执行 ./build.sh"
  exit 1
fi

# ---------- 读取服务器信息 ----------
read -r -p "远程用户名 [root]: " USERNAME
USERNAME="${USERNAME:-root}"

read -r -p "远端服务器 IP: " IP
if [[ -z "${IP// }" ]]; then
  echo -e "${RED}错误: IP 地址不能为空${NC}"
  exit 1
fi

REMOTE="${USERNAME}@${IP}"
echo ""
echo -e ">>> 目标服务器: ${CYAN}$REMOTE${NC}"
echo -e ">>> 部署目录:   ${CYAN}$REMOTE:$REMOTE_DIR${NC}"
echo ""

# ---------- 上传 zip ----------
echo ">>> [1/3] 创建远端目录并上传 zip ..."
ssh -o StrictHostKeyChecking=accept-new "$REMOTE" "mkdir -p $REMOTE_DIR"
scp -o StrictHostKeyChecking=accept-new "$ZIP_FILE" "$REMOTE:$REMOTE_DIR/$ZIP_NAME"
echo "    上传完成: $ZIP_NAME"

# ---------- 远端解压 + docker compose ----------
echo ">>> [2/3] 解压并启动容器 ..."
ssh -o StrictHostKeyChecking=accept-new "$REMOTE" bash << REMOTE_SCRIPT
  set -e
  cd $REMOTE_DIR
  echo "    解压 $ZIP_NAME ..."
  unzip -o -q "$ZIP_NAME"
  rm -f "$ZIP_NAME"
  echo "    执行 docker compose up -d --build ..."
  docker compose up -d --build
REMOTE_SCRIPT

# ---------- 确认容器状态 ----------
echo ">>> [3/3] 检查容器状态 ..."
ssh "$REMOTE" "docker ps --filter 'name=frontend' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

echo ""
echo -e "${GREEN}==> 部署完成！${NC}"
