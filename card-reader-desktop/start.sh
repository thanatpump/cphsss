#!/bin/bash

echo "========================================"
echo "  SSO Card Reader Desktop Application"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# ตรวจสอบว่ามี node_modules หรือยัง
if [ ! -d "node_modules" ]; then
    echo "⚠️  ยังไม่ได้ติดตั้ง dependencies"
    echo "📦 กำลังติดตั้ง dependencies..."
    npm install
    echo ""
fi

echo "🚀 กำลังรันโปรแกรม..."
node main.js

