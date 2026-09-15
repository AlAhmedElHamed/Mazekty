#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================="
echo "  Building macOS Application: مزيكتي (Mazekty)"
echo "============================================="

# 1. Generate icon if needed
if [ ! -f "AppIcon.icns" ]; then
    echo "Creating AppIcon.icns..."
    ./venv/bin/python create_icon.py
fi

APP_NAME="Mazekty"
APP_DIR="${APP_NAME}.app"
DMG_NAME="${APP_NAME} Installer.dmg"

echo "Removing previous builds..."
rm -rf "${APP_DIR}" "${DMG_NAME}" "dmg_temp" "مزيكتي.app" "مزيكتي Installer.dmg" "ميزكتي.app" "ميزكتي Installer.dmg"

echo "Creating App Bundle structure..."
mkdir -p "${APP_DIR}/Contents/MacOS"
mkdir -p "${APP_DIR}/Contents/Resources/app"

# 2. Write Info.plist
cat << 'EOF' > "${APP_DIR}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Mazekty</string>
    <key>CFBundleDisplayName</key>
    <string>Mazekty</string>
    <key>CFBundleIdentifier</key>
    <string>com.alahmed.mazekty</string>
    <key>CFBundleVersion</key>
    <string>2.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>Mazekty</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
    </dict>
</dict>
</plist>
EOF

echo "APPL????" > "${APP_DIR}/Contents/PkgInfo"

# 3. Copy AppIcon.icns
cp "AppIcon.icns" "${APP_DIR}/Contents/Resources/AppIcon.icns"

# 4. Copy app payload
echo "Copying application payload..."
cp -R server.py downloader.py desktop.py platform_utils.py static requirements.txt "${APP_DIR}/Contents/Resources/app/"
if [ -f "config.json" ]; then
    cp "config.json" "${APP_DIR}/Contents/Resources/app/"
fi
mkdir -p "${APP_DIR}/Contents/Resources/app/downloads"

# Copy virtual environment
echo "Bundling Python runtime..."
cp -R venv "${APP_DIR}/Contents/Resources/app/venv"

# 5. Create launcher script
echo "Creating launcher executable..."
cat << 'EOF' > "${APP_DIR}/Contents/MacOS/Mazekty"
#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_ROOT="$( cd "$SCRIPT_DIR/../Resources/app" && pwd )"

cd "$APP_ROOT"

# Ensure PATH includes ffmpeg from Homebrew or standard locations
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Run the native desktop window wrapper
exec "$APP_ROOT/venv/bin/python" "$APP_ROOT/desktop.py"
EOF

chmod +x "${APP_DIR}/Contents/MacOS/Mazekty"

echo "✓ Application Bundle created: ${APP_DIR}"

# 6. Create DMG Installer
echo "Preparing DMG folder..."
mkdir -p "dmg_temp"
cp -R "${APP_DIR}" "dmg_temp/"

# Create symlink to /Applications inside DMG
ln -s /Applications "dmg_temp/Applications"

echo "Creating DMG image: ${DMG_NAME}..."
hdiutil create -volname "${APP_NAME}" -srcfolder "dmg_temp" -ov -format UDZO "${DMG_NAME}"

# Cleanup temp folder
rm -rf "dmg_temp"

echo "============================================="
echo "  BUILD COMPLETE!"
echo "  App: ${DIR}/${APP_DIR}"
echo "  DMG: ${DIR}/${DMG_NAME}"
echo "============================================="
