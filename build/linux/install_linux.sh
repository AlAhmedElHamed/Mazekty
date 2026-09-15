#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Installing Mazekty Pro desktop shortcut on Linux..."

mkdir -p "$HOME/.local/share/applications"
mkdir -p "$HOME/.local/share/icons/hicolor/512x512/apps"

cp AppIcon.png "$HOME/.local/share/icons/hicolor/512x512/apps/mazekty.png"

# Generate desktop file with absolute path
cat << DESKTOP_EOF > "$HOME/.local/share/applications/mazekty.desktop"
[Desktop Entry]
Name=مزيكتي - Mazekty Pro
GenericName=Music Downloader & Audio Studio
GenericName[ar]=محمل ومحرر الموسيقى المتطور
Comment=100% Free & Local YouTube to MP3 Downloader, Vocal Remover & Audio Studio
Exec=$DIR/start_linux.sh
Icon=$HOME/.local/share/icons/hicolor/512x512/apps/mazekty.png
Terminal=false
Type=Application
Categories=AudioVideo;Audio;Player;AudioVideoEditing;
StartupNotify=true
DESKTOP_EOF

chmod +x "$HOME/.local/share/applications/mazekty.desktop"
echo "✓ Successfully installed to $HOME/.local/share/applications/mazekty.desktop"
