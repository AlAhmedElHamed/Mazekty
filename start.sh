#!/usr/bin/env bash
set -e

# Change to script directory
cd "$(dirname "$0")"

echo "=================================================="
echo "    YouTube to MP3 Downloader - تشغيل التطبيق     "
echo "=================================================="

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Check dependencies
echo "Verifying dependencies..."
pip install -q -r requirements.txt

# Create downloads folder if not exists
mkdir -p downloads

# Port to use
PORT=8000
HOST="127.0.0.1"
URL="http://${HOST}:${PORT}"

echo ""
echo "🚀 جاري تشغيل السيرفر على: ${URL}"
echo "📁 مجلد التنزيلات: $(pwd)/downloads"
echo ""

# Open browser after a slight delay
(sleep 2 && open "${URL}" 2>/dev/null || true) &

# Run uvicorn server
exec uvicorn server:app --host "${HOST}" --port "${PORT}"
