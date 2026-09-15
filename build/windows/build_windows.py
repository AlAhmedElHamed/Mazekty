#!/usr/bin/env python3
"""
Mazekty Pro - Windows Standalone Executable & Installer Builder
Location: build/windows/build_windows.py
Builds:
  1. dist/Mazekty/Mazekty.exe (standalone native binary, no .bat files)
  2. build/windows/Mazekty_Windows_Setup.exe (standalone installer, identical to .dmg on Mac)
"""

import os
import sys
import shutil
import subprocess

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import PyInstaller.__main__

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
BUILD_DIR = os.path.join(ROOT_DIR, "build_temp")
APP_NAME = "Mazekty"
APP_DIST_DIR = os.path.join(DIST_DIR, APP_NAME)

def find_iscc() -> str:
    """Locates Inno Setup Compiler (ISCC.exe)."""
    candidates = [
        shutil.which("iscc"),
        shutil.which("ISCC.exe"),
        r"C:\Users\media\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"),
        r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        r"C:\Program Files\Inno Setup 6\ISCC.exe",
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    return ""

def main():
    print("=" * 60)
    print("  Building Mazekty Pro Windows Standalone & Installer")
    print("=" * 60)
    print()

    # 1. Ensure bin/ with ffmpeg exists in ROOT_DIR
    bin_ffmpeg = os.path.join(ROOT_DIR, "bin", "ffmpeg.exe")
    if not os.path.isfile(bin_ffmpeg):
        print("[!] FFmpeg not found in bin/. Running setup_env.py to fetch portable FFmpeg...")
        subprocess.run([sys.executable, os.path.join(ROOT_DIR, "setup_env.py"), "--install"], check=True)

    # 2. Run PyInstaller to build standalone Mazekty.exe
    print("[*] Compiling Mazekty.exe via PyInstaller...")
    pyinstaller_args = [
        os.path.join(ROOT_DIR, "desktop.py"),
        f"--name={APP_NAME}",
        "--onedir",
        "--windowed",  # No black console window
        f"--icon={os.path.join(SCRIPT_DIR, 'AppIcon.ico')}",
        f"--add-data={os.path.join(ROOT_DIR, 'static')};static",
        f"--add-data={os.path.join(SCRIPT_DIR, 'AppIcon.ico')};.",
        f"--add-data={os.path.join(ROOT_DIR, 'AppIcon.png')};.",
        "--collect-all=pywebview",
        "--collect-all=uvicorn",
        "--collect-all=fastapi",
        "--collect-all=starlette",
        "--collect-all=mutagen",
        "--collect-all=yt_dlp",
        f"--distpath={DIST_DIR}",
        f"--workpath={BUILD_DIR}",
        "--noconfirm",
        "--clean"
    ]

    PyInstaller.__main__.run(pyinstaller_args)
    print("[OK] PyInstaller compilation completed!")

    # 3. Copy FFmpeg & FFprobe into dist/Mazekty/bin/
    dist_bin = os.path.join(APP_DIST_DIR, "bin")
    os.makedirs(dist_bin, exist_ok=True)
    src_bin = os.path.join(ROOT_DIR, "bin")
    if os.path.isdir(src_bin):
        for item in os.listdir(src_bin):
            s = os.path.join(src_bin, item)
            d = os.path.join(dist_bin, item)
            if os.path.isfile(s):
                shutil.copy2(s, d)
                print(f"[OK] Bundled {item} into app distribution")

    # Copy AppIcon.ico into root of distribution
    shutil.copy2(os.path.join(SCRIPT_DIR, "AppIcon.ico"), os.path.join(APP_DIST_DIR, "AppIcon.ico"))

    # Do not create downloads folder inside dist to prevent polluting user folder
    dist_downloads = os.path.join(APP_DIST_DIR, "downloads")
    if os.path.exists(dist_downloads):
        shutil.rmtree(dist_downloads, ignore_errors=True)

    # 4. Create Mazekty-Windows-Portable.zip
    zip_output_base = os.path.join(SCRIPT_DIR, "Mazekty-Windows-Portable")
    print(f"[*] Packaging {zip_output_base}.zip...")
    shutil.make_archive(zip_output_base, 'zip', root_dir=DIST_DIR, base_dir=APP_NAME)
    print(f"[OK] Created portable ZIP at: {zip_output_base}.zip")

    # 5. Compile Inno Setup Script
    iscc = find_iscc()
    if not iscc:
        print("[!] Inno Setup Compiler (ISCC.exe) not found.")
        print(f"[OK] Standalone directory ready at: {APP_DIST_DIR}")
        print("    You can run Mazekty.exe directly from there.")
        return 0

    print(f"[*] Compiling Inno Setup Installer using: {iscc}...")
    iss_file = os.path.join(SCRIPT_DIR, "installer_windows.iss")
    res = subprocess.run([iscc, iss_file], check=True)
    if res.returncode == 0:
        installer_path = os.path.join(SCRIPT_DIR, "Mazekty_Windows_Setup.exe")
        print()
        print("=" * 60)
        print("  BUILD COMPLETE!")
        print(f"  Installer: {installer_path}")
        print(f"  Standalone App: {os.path.join(APP_DIST_DIR, 'Mazekty.exe')}")
        print("=" * 60)
        print()

    # Clean up temp build dir
    if os.path.isdir(BUILD_DIR):
        try:
            shutil.rmtree(BUILD_DIR)
        except Exception:
            pass

    return 0

if __name__ == "__main__":
    sys.exit(main())
