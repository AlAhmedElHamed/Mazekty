#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# If environment not initialized, run installer first
if [ ! -f "venv/bin/activate" ]; then
    echo "[*] التشغيل لأول مرة: جاري استدعاء معالج التثبيت..."
    bash "$DIR/install_linux.sh"
fi

source venv/bin/activate

# Quick verify requirements
if ! python3 "$DIR/setup_env.py" --check-only &> /dev/null; then
    echo "[*] تم رصد متطلبات ناقصة، جاري التجهيز التلقائي..."
    python3 "$DIR/setup_env.py" --install
fi

mkdir -p downloads

echo "[✓] تشغيل مزيكتي برو (Launching Mazekty Pro)..."
exec python3 desktop.py
