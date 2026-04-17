#!/bin/bash

# Script สำหรับหยุดระบบ Production
# ใช้งาน: ./stop-production.sh

echo "========================================"
echo "🛑 Stopping SSO Production System"
echo "========================================"
echo ""

# อ่าน PIDs
if [ -f .main.pid ]; then
    MAIN_PID=$(cat .main.pid)
    echo "🛑 Stopping Main Service (PID: $MAIN_PID)..."
    kill $MAIN_PID 2>/dev/null && echo "✅ Main Service stopped" || echo "⚠️  Main Service not running"
    rm .main.pid
fi

if [ -f .card-reader.pid ]; then
    CARD_READER_PID=$(cat .card-reader.pid)
    echo "🛑 Stopping Card Reader Service (PID: $CARD_READER_PID)..."
    kill $CARD_READER_PID 2>/dev/null && echo "✅ Card Reader Service stopped" || echo "⚠️  Card Reader Service not running"
    rm .card-reader.pid
fi

echo ""
echo "✅ System stopped successfully!"
echo ""





