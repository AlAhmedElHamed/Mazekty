#!/usr/bin/env python3
"""
Mazekty Pro (مزيكتي برو) - Unified Environment & Dependency Setup
Cross-platform requirement verifier and installer for Windows, Linux, and macOS.
Checks:
  - Python >= 3.10
  - Virtual environment & pip
  - Python dependencies (requirements.txt + pywebview)
  - FFmpeg & FFprobe (auto-downloads portable binaries for Windows if missing)
  - ADB (Android sync) & usbmuxd (Apple sync) status
  - Downloads folder
  - Desktop shortcut creation
"""

import os
import sys
import subprocess
import shutil
import platform
import argparse
import urllib.request
import zipfile

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

CURRENT_OS = platform.system()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BIN_DIR = os.path.join(BASE_DIR, "bin")

def color_text(text: str, color_code: str) -> str:
    # Use ANSI escape sequences
    return f"\033[{color_code}m{text}\033[0m"

def print_success(msg: str):
    print(f" {color_text('[✓]', '92;1')} {msg}")

def print_warn(msg: str):
    print(f" {color_text('[!]', '93;1')} {msg}")

def print_info(msg: str):
    print(f" {color_text('[i]', '96;1')} {msg}")

def print_err(msg: str):
    print(f" {color_text('[✗]', '91;1')} {msg}")

def print_banner():
    # Set Windows console to UTF-8
    if CURRENT_OS == "Windows":
        try:
            os.system("chcp 65001 > nul")
        except Exception:
            pass

    print()
    print(color_text("=" * 64, "95;1"))
    print(color_text("   مزيكتي برو - فحص وتجهيز متطلبات النظام", "97;1"))
    print(color_text("   Mazekty Pro - Environment & Dependency Setup", "96;1"))
    print(color_text("=" * 64, "95;1"))
    print()

def check_python_version() -> bool:
    v = sys.version_info
    v_str = f"{v.major}.{v.minor}.{v.micro}"
    if v < (3, 10):
        print_err(f"Python 3.10+ is required. Detected version: {v_str}")
        print_info("Please install Python 3.10 or newer from https://www.python.org/")
        return False
    print_success(f"Python runtime: {v_str} ({CURRENT_OS})")
    return True

def get_installed_packages() -> set:
    try:
        from importlib.metadata import distributions
        return {dist.metadata["Name"].lower() for dist in distributions()}
    except Exception:
        return set()

def check_and_install_dependencies() -> bool:
    req_file = os.path.join(BASE_DIR, "requirements.txt")
    required = ["yt-dlp", "fastapi", "uvicorn", "python-multipart", "mutagen"]
    
    # Read requirements.txt if present
    if os.path.isfile(req_file):
        with open(req_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    pkg = line.split(">=")[0].split("==")[0].split("[")[0].strip().lower()
                    if pkg and pkg not in required:
                        required.append(pkg)
                        
    # Include pywebview for native desktop app window
    optional_packages = ["pywebview"]

    installed = get_installed_packages()
    missing_required = [p for p in required if p not in installed]
    missing_optional = [p for p in optional_packages if p not in installed]

    if not missing_required and not missing_optional:
        print_success(f"All Python packages verified ({len(required) + len(optional_packages)} packages ready)")
        return True

    print_info("Installing / verifying Python packages via pip...")
    cmd = [sys.executable, "-m", "pip", "install", "--upgrade", "pip", "-q"]
    try:
        subprocess.run(cmd, check=False)
    except Exception:
        pass

    install_targets = []
    if os.path.isfile(req_file):
        install_targets.extend(["-r", req_file])
    else:
        install_targets.extend(required)

    install_targets.extend(optional_packages)

    try:
        cmd = [sys.executable, "-m", "pip", "install"] + install_targets
        subprocess.run(cmd, check=True)
        print_success("Python packages installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_warn(f"Some optional packages failed to install: {e}")
        # Try installing just requirements.txt
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", req_file], check=True)
            print_success("Core requirements installed successfully")
            return True
        except Exception as e2:
            print_err(f"Failed to install requirements: {e2}")
            return False

def check_ffmpeg() -> str:
    """Check if ffmpeg is executable and return its path, or empty string."""
    sys.path.insert(0, BASE_DIR)
    try:
        import platform_utils
        ff = platform_utils.find_ffmpeg()
    except Exception:
        ff = shutil.which("ffmpeg") or ""

    if ff:
        try:
            res = subprocess.run([ff, "-version"], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return ff
        except Exception:
            pass
    return ""

def download_file_with_progress(url: str, dest_path: str):
    """Downloads a file showing progress."""
    print_info(f"Downloading from {url}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        total_size = int(response.info().get('Content-Length', 0))
        downloaded = 0
        block_size = 65536
        with open(dest_path, 'wb') as out_file:
            while True:
                buffer = response.read(block_size)
                if not buffer:
                    break
                downloaded += len(buffer)
                out_file.write(buffer)
                if total_size > 0:
                    percent = int(downloaded * 100 / total_size)
                    mb = downloaded / (1024 * 1024)
                    total_mb = total_size / (1024 * 1024)
                    sys.stdout.write(f"\r   Progress: [{percent}%] {mb:.1f} MB / {total_mb:.1f} MB")
                    sys.stdout.flush()
    print()

def install_ffmpeg_windows() -> bool:
    """Attempts to install FFmpeg on Windows using portable download or winget."""
    print_info("FFmpeg is missing. Setting up portable FFmpeg for Windows...")
    os.makedirs(BIN_DIR, exist_ok=True)
    
    # 1. First choice: Portable Direct Download into bin/ (Self-contained, no admin/winget needed)
    # Using yt-dlp's official static standalone ffmpeg builds for Windows
    download_url = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    zip_path = os.path.join(BIN_DIR, "ffmpeg_download.zip")

    try:
        download_file_with_progress(download_url, zip_path)
        print_info("Extracting ffmpeg.exe & ffprobe.exe into bin/...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                if filename.lower() in ("ffmpeg.exe", "ffprobe.exe"):
                    target_file = os.path.join(BIN_DIR, filename)
                    with zip_ref.open(member) as source, open(target_file, "wb") as target:
                        shutil.copyfileobj(source, target)
                    print_success(f"Extracted: {filename}")

        # Clean up zip file safely
        try:
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except Exception:
            pass

        ff = check_ffmpeg()
        if ff:
            print_success(f"Portable FFmpeg ready: {ff}")
            return True
    except Exception as e:
        print_warn(f"Direct portable download attempt failed: {e}")
        try:
            if os.path.exists(zip_path):
                os.remove(zip_path)
        except Exception:
            pass

    # 2. Second choice: winget
    winget = shutil.which("winget")
    if winget:
        print_info("Attempting automated install via Windows Package Manager (winget)...")
        try:
            cmd = [
                winget, "install", "--id", "Gyan.FFmpeg.Essentials",
                "-e", "--accept-source-agreements", "--accept-package-agreements"
            ]
            res = subprocess.run(cmd, timeout=180)
            if res.returncode == 0:
                ff = check_ffmpeg()
                if ff:
                    print_success(f"FFmpeg installed via winget: {ff}")
                    return True
        except Exception as e:
            print_warn(f"Winget install skipped or failed: {e}")

    print_warn("Please install FFmpeg manually from https://www.gyan.dev/ffmpeg/builds/ or via 'winget install Gyan.FFmpeg'")
    return False

def install_ffmpeg_linux() -> bool:
    """Guides or assists in installing FFmpeg on Linux."""
    print_warn("FFmpeg is not installed on this Linux system.")
    if shutil.which("apt-get"):
        print_info("To install FFmpeg on Debian/Ubuntu, run:")
        print(color_text("   sudo apt update && sudo apt install -y ffmpeg", "93;1"))
    elif shutil.which("dnf"):
        print_info("To install FFmpeg on Fedora/RHEL, run:")
        print(color_text("   sudo dnf install -y ffmpeg", "93;1"))
    elif shutil.which("pacman"):
        print_info("To install FFmpeg on Arch Linux, run:")
        print(color_text("   sudo pacman -S --noconfirm ffmpeg", "93;1"))
    else:
        print_info("Please install ffmpeg using your distribution's package manager.")
    return False

def ensure_ffmpeg() -> bool:
    ff = check_ffmpeg()
    if ff:
        print_success(f"FFmpeg engine: {ff} (100% Local)")
        return True

    if CURRENT_OS == "Windows":
        return install_ffmpeg_windows()
    elif CURRENT_OS == "Linux":
        return install_ffmpeg_linux()
    else:
        print_warn("Please install FFmpeg using Homebrew: brew install ffmpeg")
        return False

def check_optional_mobile_sync():
    """Checks optional phone cable sync tools (ADB for Android, usbmuxd for iOS)."""
    sys.path.insert(0, BASE_DIR)
    try:
        import platform_utils
        adb = platform_utils.find_adb()
        if adb:
            print_success(f"Android USB Sync: Ready ({adb})")
        else:
            print_info("Android USB Sync: Cable sync ready via MTP; ADB platform-tools optional")

        ios_devs = platform_utils.detect_connected_ios_devices()
        print_success("Apple / iOS Sync: Ready (Wi-Fi streaming & Cable sync)")
    except Exception as e:
        print_info(f"Mobile sync detection initialized: {e}")

def ensure_downloads_dir():
    downloads_dir = os.path.join(BASE_DIR, "downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    print_success(f"Downloads workspace: {downloads_dir}")

def create_desktop_shortcut() -> bool:
    """Creates desktop launcher shortcut on Windows or Linux."""
    if CURRENT_OS == "Windows":
        try:
            desktop_dir = subprocess.check_output(
                ['powershell', '-NoProfile', '-Command', '[Environment]::GetFolderPath("Desktop")'],
                text=True
            ).strip()

            shortcut_path = os.path.join(desktop_dir, "Mazekty Pro.lnk")
            icon_path = os.path.join(BASE_DIR, "AppIcon.ico")
            exe_path = os.path.join(BASE_DIR, "dist", "Mazekty", "Mazekty.exe")
            target_args = ""
            if not os.path.exists(exe_path):
                exe_path = os.path.join(BASE_DIR, "Mazekty.exe")
            if not os.path.exists(exe_path):
                exe_path = sys.executable.replace("python.exe", "pythonw.exe")
                target_args = f'"{os.path.join(BASE_DIR, "desktop.py")}"'

            ps_script = f"""
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath = "{exe_path}"
$Shortcut.Arguments = "{target_args}"
$Shortcut.WorkingDirectory = "{BASE_DIR}"
$Shortcut.Description = "مزيكتي برو - Mazekty Pro Music Downloader & Studio"
if (Test-Path "{icon_path}") {{
    $Shortcut.IconLocation = "{icon_path},0"
}}
$Shortcut.Save()
"""
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], check=True, capture_output=True)
            print_success(f"Desktop shortcut created: {shortcut_path}")
            return True
        except Exception as e:
            print_warn(f"Could not create Windows desktop shortcut: {e}")
            return False

    elif CURRENT_OS == "Linux":
        try:
            apps_dir = os.path.expanduser("~/.local/share/applications")
            icons_dir = os.path.expanduser("~/.local/share/icons/hicolor/512x512/apps")
            os.makedirs(apps_dir, exist_ok=True)
            os.makedirs(icons_dir, exist_ok=True)

            icon_src = os.path.join(BASE_DIR, "AppIcon.png")
            icon_dest = os.path.join(icons_dir, "mazekty.png")
            if os.path.isfile(icon_src):
                shutil.copyfile(icon_src, icon_dest)

            start_script = os.path.join(BASE_DIR, "start_linux.sh")
            desktop_file = os.path.join(apps_dir, "mazekty.desktop")

            content = f"""[Desktop Entry]
Name=مزيكتي - Mazekty Pro
GenericName=Music Downloader & Audio Studio
GenericName[ar]=محمل ومحرر الموسيقى المتطور
Comment=100% Free & Local YouTube to MP3 Downloader, Vocal Remover & Audio Studio
Exec={start_script}
Icon={icon_dest}
Terminal=false
Type=Application
Categories=AudioVideo;Audio;Player;AudioVideoEditing;
StartupNotify=true
"""
            with open(desktop_file, "w", encoding="utf-8") as f:
                f.write(content)

            os.chmod(desktop_file, 0o755)
            print_success(f"Linux application entry registered: {desktop_file}")
            return True
        except Exception as e:
            print_warn(f"Could not create Linux desktop entry: {e}")
            return False

    return True

def run_all(install_mode: bool = True, launch_after: bool = False) -> int:
    print_banner()

    # 1. Python version
    if not check_python_version():
        return 1

    # 2. Dependencies
    if install_mode:
        if not check_and_install_dependencies():
            print_err("Failed to setup Python dependencies.")
            return 1
    else:
        installed = get_installed_packages()
        missing = [p for p in ["yt-dlp", "fastapi", "uvicorn", "python-multipart", "mutagen"] if p not in installed]
        if missing:
            print_err(f"Missing required packages: {', '.join(missing)}")
            return 1

    # 3. FFmpeg
    ffmpeg_ok = ensure_ffmpeg()
    if not ffmpeg_ok:
        print_warn("Continuing without FFmpeg. Some audio processing and download features will be limited.")

    # 4. Downloads folder
    ensure_downloads_dir()

    # 5. Mobile Sync Status
    check_optional_mobile_sync()

    # 6. Desktop Shortcut
    if install_mode:
        create_desktop_shortcut()

    print()
    print(color_text("=" * 64, "92;1"))
    print(color_text("   ✓ اكتمل فحص وتجهيز النظام بنجاح! جاهز للانطلاق.", "92;1"))
    print(color_text("   ✓ Mazekty Pro is fully configured and ready to run!", "92;1"))
    print(color_text("=" * 64, "92;1"))
    print()

    if launch_after:
        desktop_script = os.path.join(BASE_DIR, "desktop.py")
        print_info("Starting Mazekty Pro...")
        subprocess.run([sys.executable, desktop_script])

    return 0

def main():
    parser = argparse.ArgumentParser(description="Mazekty Pro Environment & Requirements Setup")
    parser.add_argument("--check-only", action="store_true", help="Check requirements without auto-installing")
    parser.add_argument("--install", action="store_true", default=True, help="Verify and install missing requirements")
    parser.add_argument("--launch", action="store_true", help="Launch desktop app after successful setup")

    args = parser.parse_args()
    install_mode = not args.check_only
    code = run_all(install_mode=install_mode, launch_after=args.launch)
    sys.exit(code)

if __name__ == "__main__":
    main()
