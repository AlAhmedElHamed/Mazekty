#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "======================================================="
echo "   مزيكتي برو - مثبت وتجهيز متطلبات لينكس"
echo "   Mazekty Pro - Linux Installer & Setup"
echo "======================================================="
echo

# 1. Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[!] لم يتم العثور على python3!"
    echo "[!] Python 3 is not installed."
    echo "    On Debian/Ubuntu: sudo apt update && sudo apt install -y python3 python3-venv python3-pip ffmpeg"
    echo "    On Fedora:        sudo dnf install -y python3 python3-pip ffmpeg"
    echo "    On Arch Linux:    sudo pacman -S --noconfirm python python-pip ffmpeg"
    exit 1
fi

# 2. Check python3-venv support
if ! python3 -m venv --help &> /dev/null; then
    echo "[!] وحدة python3-venv غير متوفرة!"
    echo "    On Debian/Ubuntu: sudo apt update && sudo apt install -y python3-venv python3-pip"
    exit 1
fi

# 3. Check FFmpeg recommendation
if ! command -v ffmpeg &> /dev/null && [ ! -f "$DIR/bin/ffmpeg" ]; then
    echo "[!] تنبيه: لم يتم العثور على محرك FFmpeg."
    echo "    On Debian/Ubuntu: sudo apt install -y ffmpeg"
    echo "    On Fedora:        sudo dnf install -y ffmpeg"
    echo "    On Arch Linux:    sudo pacman -S --noconfirm ffmpeg"
    echo "    (يمكنك إكمال التثبيت الآن وتثبيت FFmpeg لاحقاً)"
    echo
fi

# 4. Create virtual environment if missing
if [ ! -f "venv/bin/activate" ]; then
    echo "[*] جاري إنشاء البيئة الافتراضية venv..."
    python3 -m venv venv
fi

# 5. Activate virtual environment
source venv/bin/activate

# 6. Run Python setup engine
python3 setup_env.py --install

# 7. Ensure executable permissions
chmod +x "$DIR/start_linux.sh"
chmod +x "$DIR/install_linux.sh"

echo
echo "======================================================="
echo "[✓] تم اكتمال التثبيت بنجاح على نظام لينكس!"
echo "    يمكنك تشغيل التطبيق عبر:"
echo "    1. اختصار التطبيقات (Mazekty Pro)"
echo "    2. أو عبر الطرفية: ./start_linux.sh"
echo "======================================================="
echo
exit 0
