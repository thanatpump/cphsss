#!/bin/bash

echo "========================================"
echo "  สร้างไฟล์ ZIP สำหรับแจกจ่าย"
echo "  SSO Card Reader"
echo "========================================"
echo ""

cd "$(dirname "$0")"

ZIP_NAME="SSO-CardReader-For-Users.zip"
FOLDER_NAME="SSO-CardReader-For-Users"

# ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่
if [ ! -d "$FOLDER_NAME" ]; then
    echo "❌ ไม่พบโฟลเดอร์ $FOLDER_NAME!"
    echo ""
    echo "💡 กรุณาสร้างโฟลเดอร์และ copy ไฟล์เข้าไปก่อน"
    echo ""
    exit 1
fi

echo "✅ พบโฟลเดอร์ $FOLDER_NAME"
echo ""

# ลบไฟล์ ZIP เก่า (ถ้ามี)
if [ -f "$ZIP_NAME" ]; then
    echo "🗑️  ลบไฟล์ ZIP เก่า..."
    rm "$ZIP_NAME"
fi

echo "📦 กำลังสร้างไฟล์ ZIP..."
echo ""

# สร้าง ZIP
zip -r "$ZIP_NAME" "$FOLDER_NAME" -x "*.DS_Store" "*/._*" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "  ✅ สร้างไฟล์ ZIP สำเร็จ!"
    echo "========================================"
    echo ""
    echo "📁 ไฟล์: $ZIP_NAME"
    
    # แสดงขนาดไฟล์
    if command -v stat > /dev/null; then
        SIZE=$(stat -f%z "$ZIP_NAME" 2>/dev/null || stat -c%s "$ZIP_NAME" 2>/dev/null)
        SIZE_MB=$((SIZE / 1024 / 1024))
        echo "📊 ขนาด: ${SIZE_MB} MB"
    fi
    
    echo ""
    echo "💡 ไฟล์พร้อมแจกจ่ายแล้ว!"
    echo ""
else
    echo ""
    echo "❌ สร้างไฟล์ ZIP ล้มเหลว"
    echo ""
    exit 1
fi
