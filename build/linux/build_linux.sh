#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Building Linux Portable Package..."
TAR_NAME="Mazekty-Linux-Portable.tar.gz"
TEMP_DIR="mazekty_linux_dist"

rm -rf "$TEMP_DIR" "$TAR_NAME"
mkdir -p "$TEMP_DIR"

cp -R server.py downloader.py desktop.py platform_utils.py static requirements.txt \
      start_linux.sh install_linux.sh mazekty.desktop AppIcon.png AppIcon_1024.png README.md "$TEMP_DIR/"

tar -czf "$TAR_NAME" "$TEMP_DIR"
rm -rf "$TEMP_DIR"

echo "✓ Linux package built: $TAR_NAME"
