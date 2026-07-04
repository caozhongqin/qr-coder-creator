#!/bin/bash
set -e

# ============================================================
# Qrcoder - 二维码生成工具启动脚本
#
# 用法:
#   ./qrcoder.sh                      # 启动服务，打开浏览器
#   ./qrcoder.sh -m "世界你好"         # 启动服务并自动生成二维码
#   ./qrcoder.sh -f test.txt          # 读取文件内容生成二维码
#   ./qrcoder.sh -f /c/x/d/test.txt   # 绝对路径
# ============================================================

# --- 解析参数 ---
TEXT=""
FILE=""

while getopts "m:f:" opt; do
    case $opt in
        m) TEXT="$OPTARG" ;;
        f) FILE="$OPTARG" ;;
        *) echo "用法: qrcoder.sh [-m \"文本内容\"] [-f 文件路径]"; exit 1 ;;
    esac
done

# --- 定位项目目录（脚本所在目录） ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# --- 如果 -f 参数存在，读取文件内容（相对于当前工作目录或绝对路径） ---
if [ -n "$FILE" ]; then
    if [ ! -f "$FILE" ]; then
        echo "错误: 文件不存在: $FILE"
        exit 1
    fi
    TEXT=$(cat "$FILE")
fi

# --- 检查并释放 5000 端口 ---
PID=$(lsof -ti:5000 2>/dev/null || true)
if [ -n "$PID" ]; then
    echo "端口 5000 被占用 (PID: $PID)，正在关闭..."
    kill "$PID" 2>/dev/null || true
    sleep 1
fi

# --- 安装依赖 ---
echo "正在安装依赖..."
uv sync

# --- 启动服务 ---
if [ -n "$TEXT" ]; then
    # 将文本写入临时文件，传递给 main.py
    TMPFILE=$(mktemp 2>/dev/null || mktemp -t qrcoder_input)
    printf '%s' "$TEXT" > "$TMPFILE"
    echo "正在启动服务并生成二维码..."
    uv run python main.py --text-file "$TMPFILE"
    # 服务退出后清理临时文件
    rm -f "$TMPFILE"
else
    echo "正在启动服务..."
    uv run python main.py
fi
