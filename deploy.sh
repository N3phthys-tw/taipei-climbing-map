#!/bin/bash

# Taipei Climbing Map - One-liner Deployment Script
# 讓部署 GitHub Pages 變得簡單

echo "🚀 開始部署至 GitHub Pages..."

# 1. 確保目前在 main 分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ 請切換至 main 分支再執行部署。"
    exit 1
fi

# 2. 暫時建立/切換至 gh-pages 分支
# 使用 git push 的方式直接將本地 main 推送到遠端 gh-pages 分支
# 這樣不需要在本地頻繁切換分支
git push origin main:gh-pages --force

echo "✅ 部署完成！"
echo "🌐 您的網站將在幾分鐘後於 GitHub Pages 上線。"
echo "🔗 網址通常為: https://<您的帳號>.github.io/taipei-climbing-map/"
