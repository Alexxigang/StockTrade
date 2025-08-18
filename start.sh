#!/bin/bash

echo "======================================="
echo "股票交易记录管理系统"
echo "======================================="
echo

# 检查Node.js
echo "检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi
echo "Node.js 已安装: $(node --version)"
echo

# 检查npm
echo "检查npm环境..."
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm"
    exit 1
fi
echo "npm 已安装: $(npm --version)"
echo

# 安装依赖
echo "安装依赖包..."
npm install
if [ $? -ne 0 ]; then
    echo "错误: 依赖安装失败"
    exit 1
fi
echo

# 启动服务
echo "启动开发服务器..."
echo "浏览器将自动打开 http://localhost:3000"
echo "按 Ctrl+C 停止服务器"
echo
npm start

