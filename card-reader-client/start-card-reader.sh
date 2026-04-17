#!/bin/bash
# Card Reader Service Starter
# For macOS/Linux

echo "========================================"
echo "    Card Reader Service"
echo "    SSO Chaiyaphum"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Please install Node.js:"
    echo "  macOS:  brew install node"
    echo "  Ubuntu: sudo apt install nodejs npm"
    echo ""
    exit 1
fi

echo "[1/3] Checking Node.js..."
node --version
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "[2/3] Installing dependencies..."
    npm install
    echo ""
else
    echo "[2/3] Dependencies already installed"
    echo ""
fi

# Start Card Reader Service
echo "[3/3] Starting Card Reader Service..."
echo ""
echo "========================================"
echo "  Service running at:"
echo "  http://localhost:8080"
echo ""
echo "  Insert your ID card and open:"
echo "  http://your-server-ip:3000"
echo ""
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

node card-reader-service.js



