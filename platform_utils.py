"""
Platform abstraction utility for Mazekty (مزيكتي)
Provides cross-platform support for macOS, Windows, and Linux:
- App configuration paths
- Default download paths
- System file manager launching
- Media player synchronization (Apple Music on macOS, Windows Music on Windows, XDG Music on Linux)
- FFmpeg discovery
"""

import os
import sys
import platform
import subprocess
import shutil
from typing import Optional, List, Dict, Any

CURRENT_OS = platform.system()  # 'Darwin', 'Windows', 'Linux'

def get_os_name() -> str:
    if CURRENT_OS == "Darwin":
        return "macOS"
    elif CURRENT_OS == "Windows":
        return "Windows"
    elif CURRENT_OS == "Linux":
        return "Linux"
    return CURRENT_OS

def get_user_data_dir() -> str:
    """Returns persistent application data directory based on OS."""
    if CURRENT_OS == "Darwin":
        base = os.path.expanduser("~/Library/Application Support")
    elif CURRENT_OS == "Windows":
        base = os.environ.get("APPDATA", os.path.expanduser("~\\AppData\\Roaming"))
    else:  # Linux / FreeDesktop XDG
        base = os.environ.get("XDG_CONFIG_HOME", os.path.expanduser("~/.config"))
    
    app_dir = os.path.join(base, "Mazekty")
    os.makedirs(app_dir, exist_ok=True)
    return app_dir

def get_config_path() -> str:
    """Returns the path to the persistent config.json file."""
    return os.path.join(get_user_data_dir(), "config.json")

def get_default_download_dir(fallback_base: Optional[str] = None) -> str:
    """Returns sensible default download folder per OS."""
    if CURRENT_OS == "Darwin":
        path = os.path.expanduser("~/Downloads/Mazekty")
    elif CURRENT_OS == "Windows":
        path = os.path.expanduser("~\\Downloads\\Mazekty")
    elif CURRENT_OS == "Linux":
        xdg_download = os.environ.get("XDG_DOWNLOAD_DIR")
        if xdg_download and os.path.exists(xdg_download):
            path = os.path.join(xdg_download, "Mazekty")
        else:
            path = os.path.expanduser("~/Downloads/Mazekty")
    else:
        if fallback_base:
            path = os.path.join(fallback_base, "downloads")
        else:
            path = os.path.expanduser("~/Downloads/Mazekty")
            
    os.makedirs(path, exist_ok=True)
    return path

def find_ffmpeg() -> str:
    """Locates ffmpeg binary across common paths for all platforms."""
    # 1. PATH lookup
    ff = shutil.which("ffmpeg")
    if ff:
        return ff

    # 2. Platform specific locations
    candidates: List[str] = []
    if CURRENT_OS == "Darwin":
        candidates = [
            "/opt/homebrew/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            os.path.expanduser("~/homebrew/bin/ffmpeg"),
            "/opt/local/bin/ffmpeg"
        ]
    elif CURRENT_OS == "Windows":
        candidates = [
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\ffmpeg\bin\ffmpeg.exe"),
            os.path.expandvars(r"%APPDATA%\ffmpeg\bin\ffmpeg.exe"),
            r".\ffmpeg.exe",
            r".\bin\ffmpeg.exe"
        ]
    elif CURRENT_OS == "Linux":
        candidates = [
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "/snap/bin/ffmpeg",
            os.path.expanduser("~/.local/bin/ffmpeg")
        ]

    for c in candidates:
        if os.path.exists(c) and os.access(c, os.X_OK):
            return c

    return "ffmpeg"  # fallback to PATH default

def open_folder_in_explorer(folder_path: str) -> bool:
    """Opens folder in native file manager (Finder / Explorer / Nautilus)."""
    abs_path = os.path.abspath(folder_path)
    if not os.path.exists(abs_path):
        os.makedirs(abs_path, exist_ok=True)

    try:
        if CURRENT_OS == "Darwin":
            subprocess.run(["open", abs_path], check=True)
            return True
        elif CURRENT_OS == "Windows":
            subprocess.run(["explorer", abs_path], check=True)
            return True
        elif CURRENT_OS == "Linux":
            subprocess.run(["xdg-open", abs_path], check=True)
            return True
    except Exception as e:
        print(f"Error opening folder: {e}")
        return False
    return False

def open_file_in_system(file_path: str) -> bool:
    """Opens a single file in the default system media player."""
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        return False

    try:
        if CURRENT_OS == "Darwin":
            subprocess.run(["open", abs_path], check=True)
            return True
        elif CURRENT_OS == "Windows":
            os.startfile(abs_path)
            return True
        elif CURRENT_OS == "Linux":
            subprocess.run(["xdg-open", abs_path], check=True)
            return True
    except Exception as e:
        print(f"Error opening file: {e}")
        return False
    return False

def get_all_local_ips() -> List[str]:
    """Returns all detected local IPv4 addresses on active network interfaces."""
    import socket
    import re
    ips = []
    
    # 1. Primary route via UDP socket connect
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127."):
            ips.append(primary_ip)
    except Exception:
        pass

    # 2. Hostname resolution
    try:
        host_ip = socket.gethostbyname(socket.gethostname())
        if host_ip and not host_ip.startswith("127.") and host_ip not in ips:
            ips.append(host_ip)
    except Exception:
        pass

    # 3. Ifconfig / ip addr fallback on macOS & Linux
    if CURRENT_OS in ("Darwin", "Linux"):
        try:
            cmd = ["ifconfig"] if CURRENT_OS == "Darwin" else ["ip", "addr"]
            out = subprocess.check_output(cmd, text=True, timeout=3)
            found = re.findall(r"(?:inet|inet addr:)\s*(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)", out)
            for ip in found:
                if ip not in ips and not ip.startswith("127."):
                    ips.append(ip)
        except Exception:
            pass

    return ips if ips else ["127.0.0.1"]

def get_local_ip() -> str:
    """Returns the most likely local Wi-Fi / LAN IP of the machine."""
    ips = get_all_local_ips()
    # Prioritize standard home Wi-Fi ranges (192.168.x.x)
    for ip in ips:
        if ip.startswith("192.168."):
            return ip
    for ip in ips:
        if ip.startswith("10."):
            return ip
    for ip in ips:
        if not ip.startswith("127."):
            return ip
    return "127.0.0.1"

IPHONE_MODEL_MAP = {
    "iPhone18,1": "iPhone 16 Pro",
    "iPhone18,2": "iPhone 16 Pro Max",
    "iPhone17,1": "iPhone 16 Pro",
    "iPhone17,2": "iPhone 16 Pro Max",
    "iPhone17,3": "iPhone 16",
    "iPhone17,4": "iPhone 16 Plus",
    "iPhone16,1": "iPhone 15 Pro",
    "iPhone16,2": "iPhone 15 Pro Max",
    "iPhone15,4": "iPhone 15",
    "iPhone15,5": "iPhone 15 Plus",
    "iPhone15,2": "iPhone 14 Pro",
    "iPhone15,3": "iPhone 14 Pro Max",
    "iPhone14,7": "iPhone 14",
    "iPhone14,8": "iPhone 14 Plus",
    "iPhone14,2": "iPhone 13 Pro",
    "iPhone14,3": "iPhone 13 Pro Max",
    "iPhone14,5": "iPhone 13",
    "iPhone14,4": "iPhone 13 mini",
    "iPhone13,1": "iPhone 12 mini",
    "iPhone13,2": "iPhone 12",
    "iPhone13,3": "iPhone 12 Pro",
    "iPhone13,4": "iPhone 12 Pro Max",
    "iPhone12,1": "iPhone 11",
    "iPhone12,3": "iPhone 11 Pro",
    "iPhone12,5": "iPhone 11 Pro Max",
}

def detect_connected_ios_devices() -> List[Dict[str, Any]]:
    """
    Detects iOS devices (iPhone, iPad) connected to the computer via:
    1. Native usbmuxd unix socket on macOS & Linux (/var/run/usbmuxd)
    2. TCP socket on Windows (127.0.0.1:27015 via Apple Mobile Device Service)
    3. Fallback to system_profiler SPUSBDataType
    """
    import socket
    import plistlib
    import struct

    devices: List[Dict[str, Any]] = []

    # 1. Native usbmuxd query (Instant, supports USB-C, Lightning, Thunderbolt)
    try:
        if CURRENT_OS == "Windows":
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(1.0)
            s.connect(("127.0.0.1", 27015))
        else:
            s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            s.settimeout(1.0)
            s.connect("/var/run/usbmuxd")

        payload = plistlib.dumps({
            "MessageType": "ListDevices",
            "ClientVersionString": "Mazekty-2.0",
            "ProgName": "Mazekty"
        }, fmt=plistlib.FMT_XML)
        header = struct.pack("<IIII", len(payload) + 16, 1, 8, 1)
        s.sendall(header + payload)

        resp_header = s.recv(16)
        if len(resp_header) == 16:
            length = struct.unpack("<IIII", resp_header)[0]
            resp_payload = s.recv(length - 16)
            res = plistlib.loads(resp_payload)
            device_list = res.get("DeviceList", [])

            for dev in device_list:
                props = dev.get("Properties", {})
                dev_id = props.get("DeviceID")
                serial = props.get("SerialNumber", "")
                conn_type = props.get("ConnectionType", "USB-C / Cable")

                dev_name = "iPhone"
                product_type = ""
                ios_version = ""

                # Query lockdown service on port 62078 for detailed model & device name
                try:
                    s2 = socket.socket(socket.AF_UNIX if CURRENT_OS != "Windows" else socket.AF_INET, socket.SOCK_STREAM)
                    s2.settimeout(0.8)
                    if CURRENT_OS == "Windows":
                        s2.connect(("127.0.0.1", 27015))
                    else:
                        s2.connect("/var/run/usbmuxd")

                    cp = plistlib.dumps({
                        "MessageType": "Connect",
                        "ClientVersionString": "Mazekty-2.0",
                        "ProgName": "Mazekty",
                        "DeviceID": dev_id,
                        "PortNumber": socket.htons(62078)
                    }, fmt=plistlib.FMT_XML)
                    s2.sendall(struct.pack("<IIII", len(cp) + 16, 1, 8, 1) + cp)
                    h2 = s2.recv(16)
                    l2 = struct.unpack("<IIII", h2)[0]
                    s2.recv(l2 - 16)

                    for k in ["DeviceName", "ProductType", "ProductVersion"]:
                        q = plistlib.dumps({"Request": "GetValue", "Key": k, "Label": "Mazekty"}, fmt=plistlib.FMT_XML)
                        s2.sendall(struct.pack(">I", len(q)) + q)
                        r_len = struct.unpack(">I", s2.recv(4))[0]
                        ans = plistlib.loads(s2.recv(r_len))
                        val = ans.get("Value", "")
                        if k == "DeviceName" and val: dev_name = val
                        elif k == "ProductType" and val: product_type = val
                        elif k == "ProductVersion" and val: ios_version = val
                    s2.close()
                except Exception:
                    pass

                model_name = IPHONE_MODEL_MAP.get(product_type, f"Apple {dev_name}")
                devices.append({
                    "name": dev_name,
                    "model": model_name,
                    "product_type": product_type,
                    "ios_version": ios_version,
                    "serial": serial,
                    "connection": conn_type,
                    "manufacturer": "Apple Inc.",
                    "status": "connected"
                })
        s.close()
    except Exception:
        pass

    if devices:
        return devices

    # 2. Fallback to system_profiler SPUSBDataType
    if CURRENT_OS == "Darwin":
        try:
            import json
            p = subprocess.run(["system_profiler", "SPUSBDataType", "-json"], capture_output=True, text=True, timeout=5)
            if p.returncode == 0:
                data = json.loads(p.stdout)
                def find_apple_devs(node):
                    if isinstance(node, list):
                        for x in node: find_apple_devs(x)
                    elif isinstance(node, dict):
                        name = node.get("_name", "")
                        if any(k in name.lower() for k in ["iphone", "ipad", "ipod"]):
                            devices.append({
                                "name": name,
                                "model": name,
                                "serial": node.get("serial_num", ""),
                                "manufacturer": node.get("manufacturer", "Apple Inc."),
                                "connection": "USB",
                                "status": "connected"
                            })
                        for v in node.values():
                            if isinstance(v, (list, dict)):
                                find_apple_devs(v)
                find_apple_devs(data)
        except Exception:
            pass

    return devices

def trigger_finder_ios_sync() -> Dict[str, Any]:
    """Initiates device sync on macOS with connected iPhone/iPad."""
    if CURRENT_OS != "Darwin":
        return {"success": False, "message": "Finder device sync is only available on macOS."}

    ascript = '''
    tell application "Finder"
        activate
        try
            make new Finder window to computer container
        on error
        end try
    end tell
    '''
    try:
        subprocess.run(["osascript", "-e", ascript], capture_output=True, text=True, timeout=5)
        return {"success": True, "message": "تم فتح نافذة أجهزة الماك في Finder بنجاح! يمكنك الآن اختيار الآيفون والضغط على مزامنة الموسيقى."}
    except Exception as e:
        return {"success": False, "message": str(e)}

def sync_to_system_music_library(file_path: str, playlist_name: str = "Mazekty") -> Dict[str, Any]:
    """
    Syncs track with native OS media library and custom playlist:
    - macOS: Apple Music via AppleScript with playlist creation
    - Windows: Copies/links to Windows Music Library folder
    - Linux: Copies/links to standard XDG_MUSIC_DIR
    """
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        return {"success": False, "message": "File not found"}

    filename = os.path.basename(abs_path)
    clean_playlist = playlist_name.strip() if playlist_name and playlist_name.strip() else "Mazekty"

    if CURRENT_OS == "Darwin":
        applescript = f'''
        tell application "Music"
            try
                if not (exists playlist "{clean_playlist}") then
                    make new playlist with properties {{name:"{clean_playlist}"}}
                end if
                set targetPlaylist to playlist "{clean_playlist}"
                set addedTrack to (add POSIX file "{abs_path}" to targetPlaylist)
                return "SUCCESS"
            on error errMsg
                return errMsg
            end try
        end tell
        '''
        try:
            res = subprocess.run(["osascript", "-e", applescript], capture_output=True, text=True, timeout=10)
            if "SUCCESS" in res.stdout:
                return {
                    "success": True,
                    "message": f"تمت إضافة {filename} إلى قائمة التشغيل '{clean_playlist}' في Apple Music بنجاح!",
                    "player": "Apple Music",
                    "playlist": clean_playlist
                }
            else:
                return {"success": False, "message": res.stdout.strip(), "player": "Apple Music"}
        except Exception as e:
            return {"success": False, "message": str(e), "player": "Apple Music"}

    elif CURRENT_OS == "Windows":
        try:
            music_dir = os.path.expanduser(f"~\\Music\\{clean_playlist}")
            os.makedirs(music_dir, exist_ok=True)
            dest = os.path.join(music_dir, filename)
            if not os.path.exists(dest):
                shutil.copy2(abs_path, dest)
            return {"success": True, "message": f"تمت إضافة {filename} إلى مجلد قائمة التشغيل '{clean_playlist}' بنجاح!", "player": "Windows Music", "playlist": clean_playlist}
        except Exception as e:
            return {"success": False, "message": str(e), "player": "Windows Music"}

    else:
        try:
            base_dir = os.environ.get("XDG_MUSIC_DIR", os.path.expanduser("~/Music"))
            music_dir = os.path.join(base_dir, clean_playlist)
            os.makedirs(music_dir, exist_ok=True)
            dest = os.path.join(music_dir, filename)
            if not os.path.exists(dest):
                shutil.copy2(abs_path, dest)
            return {"success": True, "message": f"تمت إضافة {filename} إلى قائمة '{clean_playlist}' بنجاح!", "player": "Linux Music", "playlist": clean_playlist}
        except Exception as e:
            return {"success": False, "message": str(e), "player": "Linux Music"}

def sync_playlist_to_apple_music(file_paths: List[str], playlist_name: str = "Mazekty") -> Dict[str, Any]:
    """Batch imports a list of audio files into a dedicated Apple Music / System playlist."""
    clean_playlist = playlist_name.strip() if playlist_name and playlist_name.strip() else "Mazekty"
    synced = 0
    failed = 0

    for fp in file_paths:
        res = sync_to_system_music_library(fp, clean_playlist)
        if res.get("success"):
            synced += 1
        else:
            failed += 1

    return {
        "success": True,
        "playlist": clean_playlist,
        "synced_count": synced,
        "failed_count": failed,
        "total": len(file_paths)
    }

def choose_folder_dialog(initial_dir: Optional[str] = None) -> Optional[str]:
    """Displays native folder chooser dialog cross-platform."""
    if CURRENT_OS == "Darwin":
        init_posix = os.path.abspath(initial_dir) if initial_dir and os.path.exists(initial_dir) else os.path.expanduser("~")
        ascript = f'''
        tell application "System Events"
            activate
            try
                set selFolder to choose folder with prompt "اختر مجلد حفظ تنزيلات مزيكتي:" default location POSIX file "{init_posix}"
                return POSIX path of selFolder
            on error
                return ""
            end try
        end tell
        '''
        try:
            p = subprocess.run(["osascript", "-e", ascript], capture_output=True, text=True)
            path = p.stdout.strip()
            if path and os.path.isdir(path):
                return path
        except Exception:
            pass

    elif CURRENT_OS == "Windows":
        ps_cmd = '''
        Add-Type -AssemblyName System.Windows.Forms
        $f = New-Object System.Windows.Forms.FolderBrowserDialog
        $f.Description = "اختر مجلد حفظ تنزيلات مزيكتي"
        $f.ShowNewFolderButton = $true
        if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $f.SelectedPath
        }
        '''
        try:
            p = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
            path = p.stdout.strip()
            if path and os.path.isdir(path):
                return path
        except Exception:
            pass

    elif CURRENT_OS == "Linux":
        if shutil.which("zenity"):
            try:
                p = subprocess.run(["zenity", "--file-selection", "--directory", "--title=اختر مجلد حفظ تنزيلات مزيكتي"], capture_output=True, text=True)
                path = p.stdout.strip()
                if path and os.path.isdir(path):
                    return path
            except Exception:
                pass
        elif shutil.which("kdialog"):
            try:
                p = subprocess.run(["kdialog", "--getexistingdirectory"], capture_output=True, text=True)
                path = p.stdout.strip()
                if path and os.path.isdir(path):
                    return path
            except Exception:
                pass

    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(initialdir=initial_dir or os.path.expanduser("~"))
        root.destroy()
        if selected and os.path.isdir(selected):
            return selected
    except Exception:
        pass

    return None
