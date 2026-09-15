#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "======================================================="
echo "   مزيكتي برو - Mazekty Pro for Linux"
echo "======================================================="

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[!] Python 3 is not installed. Please install python3."
    exit 1
fi

# Create venv if missing
if [ ! -f "venv/bin/activate" ]; then
    echo "[*] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
echo "[*] Verifying dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

mkdir -p downloads

# Run app
echo "[✓] Launching Mazekty Pro..."
exec python3 desktop.py
