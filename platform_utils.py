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
import time
import platform
import subprocess
import shutil
import re
from typing import Optional, List, Dict, Any

CURRENT_OS = platform.system()  # 'Darwin', 'Windows', 'Linux'

# Windows PnP device scan cache
_last_win_pnp_scan: float = 0.0
_cached_win_pnp_devices: List[Dict[str, Any]] = []

def run_silent_cmd(cmd: List[str], **kwargs) -> subprocess.CompletedProcess:
    """Executes subprocess completely silently with CREATE_NO_WINDOW, SW_HIDE, and DEVNULL stdin on Windows."""
    if CURRENT_OS == "Windows":
        kwargs["creationflags"] = kwargs.get("creationflags", 0) | getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
        if "startupinfo" not in kwargs:
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 0  # SW_HIDE
            kwargs["startupinfo"] = si
        if "stdin" not in kwargs:
            kwargs["stdin"] = subprocess.DEVNULL
    return subprocess.run(cmd, **kwargs)

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
    # 0. Local app bin directory lookup (highest priority for portable installations)
    base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
    local_candidates = [
        os.path.join(base_dir, "bin", "ffmpeg.exe" if CURRENT_OS == "Windows" else "ffmpeg"),
        os.path.join(base_dir, "ffmpeg.exe" if CURRENT_OS == "Windows" else "ffmpeg"),
    ]
    for c in local_candidates:
        if os.path.isfile(c) and (CURRENT_OS == "Windows" or os.access(c, os.X_OK)):
            return os.path.abspath(c)

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
        if os.path.isfile(c) and (CURRENT_OS == "Windows" or os.access(c, os.X_OK)):
            return os.path.abspath(c)

    return "ffmpeg"  # fallback to PATH default

def find_ffprobe() -> str:
    """Locates ffprobe binary across common paths for all platforms."""
    base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
    local_candidates = [
        os.path.join(base_dir, "bin", "ffprobe.exe" if CURRENT_OS == "Windows" else "ffprobe"),
        os.path.join(base_dir, "ffprobe.exe" if CURRENT_OS == "Windows" else "ffprobe"),
    ]
    for c in local_candidates:
        if os.path.isfile(c) and (CURRENT_OS == "Windows" or os.access(c, os.X_OK)):
            return os.path.abspath(c)

    fp = shutil.which("ffprobe")
    if fp:
        return fp

    ffmpeg_p = find_ffmpeg()
    if os.path.isabs(ffmpeg_p):
        probe_next = os.path.join(os.path.dirname(ffmpeg_p), "ffprobe.exe" if CURRENT_OS == "Windows" else "ffprobe")
        if os.path.isfile(probe_next):
            return probe_next

    return "ffprobe"

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
            os.startfile(abs_path)
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

def is_vpn_or_virtual_ip(ip: str) -> bool:
    """Detects if an IPv4 address belongs to a VPN tunnel (e.g. Mullvad, WireGuard, Tailscale) or virtual switch."""
    if not ip or ip.startswith("127."):
        return True
    # Mullvad Wireguard default subnets: 10.64.0.0/10, 10.128.x.x
    if ip.startswith("10.128.") or ip.startswith("10.64."):
        return True
    # Tailscale / CGNAT range (100.64.0.0 - 100.127.255.255)
    if ip.startswith("100."):
        parts = ip.split(".")
        if len(parts) > 1 and parts[1].isdigit() and 64 <= int(parts[1]) <= 127:
            return True
    # Benchmarking/test ranges
    if ip.startswith("198.18.") or ip.startswith("198.19."):
        return True
    return False

def get_all_local_ips() -> List[str]:
    """Returns all detected local IPv4 addresses on active network interfaces, prioritizing physical LAN."""
    import socket
    import re
    ips = []
    
    # 1. Hostname resolution across all local network adapters
    try:
        _, _, host_ips = socket.gethostbyname_ex(socket.gethostname())
        for hip in host_ips:
            if hip and not hip.startswith("127.") and hip not in ips:
                ips.append(hip)
    except Exception:
        pass

    # 2. Primary route via UDP socket connect
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        primary_ip = s.getsockname()[0]
        s.close()
        if primary_ip and not primary_ip.startswith("127.") and primary_ip not in ips:
            ips.append(primary_ip)
    except Exception:
        pass

    # 3. OS-level command fallback (ipconfig on Windows, ifconfig/ip on Unix)
    try:
        if CURRENT_OS == "Windows":
            p = run_silent_cmd(["ipconfig"], capture_output=True, text=True, timeout=3)
            if p.returncode == 0:
                found = re.findall(r"IPv4 Address[.\s]+:\s*([0-9.]+)", p.stdout)
                for ip in found:
                    if ip not in ips and not ip.startswith("127."):
                        ips.append(ip)
        elif CURRENT_OS in ("Darwin", "Linux"):
            cmd = ["ifconfig"] if CURRENT_OS == "Darwin" else ["ip", "addr"]
            out = subprocess.check_output(cmd, text=True, timeout=3)
            found = re.findall(r"(?:inet|inet addr:)\s*(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)", out)
            for ip in found:
                if ip not in ips and not ip.startswith("127."):
                    ips.append(ip)
    except Exception:
        pass

    # Sort so physical LAN IPs come first, and VPN tunnel IPs come last
    physical_ips = [ip for ip in ips if not is_vpn_or_virtual_ip(ip)]
    vpn_ips = [ip for ip in ips if is_vpn_or_virtual_ip(ip)]
    sorted_ips = physical_ips + vpn_ips

    return sorted_ips if sorted_ips else ["127.0.0.1"]

def get_local_ip() -> str:
    """
    Returns the most reliable physical local Wi-Fi / Ethernet LAN IP of the machine.
    Filters out VPN tunnel IPs (e.g. Mullvad) to ensure mobile phones can connect seamlessly.
    """
    import re
    ips = get_all_local_ips()
    
    # 1. Standard home Wi-Fi (192.168.x.x)
    for ip in ips:
        if ip.startswith("192.168.") and not is_vpn_or_virtual_ip(ip):
            return ip

    # 2. Private LAN / Ethernet (172.16.x.x - 172.31.x.x)
    for ip in ips:
        if re.match(r"^172\.(?:1[6-9]|2\d|3[01])\.", ip) and not is_vpn_or_virtual_ip(ip):
            return ip

    # 3. Standard Class A LAN (10.x.x.x excluding VPN subnets)
    for ip in ips:
        if ip.startswith("10.") and not is_vpn_or_virtual_ip(ip):
            return ip

    # 4. Any other non-VPN IP
    for ip in ips:
        if not ip.startswith("127.") and not is_vpn_or_virtual_ip(ip):
            return ip

    # 5. Fallback to first available IP
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
                    "id": serial or dev_id,
                    "name": dev_name,
                    "model": model_name,
                    "product_type": product_type,
                    "ios_version": ios_version,
                    "serial": serial,
                    "platform": "ios",
                    "icon": "🍏",
                    "connection": conn_type,
                    "manufacturer": "Apple Inc.",
                    "status": "connected"
                })
        s.close()
    except Exception:
        pass

    if devices:
        return devices

    # 2. Fallback to system_profiler SPUSBHostDataType & SPUSBDataType
    if CURRENT_OS == "Darwin":
        import json
        for dt in ["SPUSBHostDataType", "SPUSBDataType"]:
            try:
                p = subprocess.run(["system_profiler", dt, "-json"], capture_output=True, text=True, timeout=5)
                if p.returncode == 0:
                    data = json.loads(p.stdout)
                    def find_apple_devs(node):
                        if isinstance(node, list):
                            for x in node: find_apple_devs(x)
                        elif isinstance(node, dict):
                            name = node.get("_name", "")
                            mfg = node.get("USBDeviceKeyVendorName", "") or node.get("manufacturer", "")
                            if any(k in name.lower() for k in ["iphone", "ipad", "ipod"]):
                                serial = node.get("USBDeviceKeySerialNumber", "") or node.get("serial_num", "")
                                if serial == "Not Provided": serial = ""
                                devices.append({
                                    "id": serial or name,
                                    "name": name,
                                    "model": name,
                                    "serial": serial,
                                    "platform": "ios",
                                    "icon": "🍏",
                                    "manufacturer": mfg or "Apple Inc.",
                                    "connection": "USB-C / Lightning",
                                    "status": "connected"
                                })
                            for k in ["_items", "_subitems"]:
                                if k in node: find_apple_devs(node[k])
                            for v in node.values():
                                if isinstance(v, (list, dict)):
                                    find_apple_devs(v)
                    find_apple_devs(data)
                    if devices:
                        break
            except Exception:
                pass

    return devices

ANDROID_VENDORS = {
    "0x18d1": "Google",
    "0x04e8": "Samsung",
    "0x2717": "Xiaomi",
    "0x12d1": "Huawei",
    "0x22d9": "OnePlus / OPPO",
    "0x2d95": "Vivo",
    "0x22b8": "Motorola",
    "0x1004": "LG",
    "0x0fce": "Sony",
    "0x0bb4": "HTC",
    "0x0b05": "ASUS",
    "0x0e8d": "MediaTek",
    "0x17ef": "Lenovo",
    "0x2a70": "Transsion",
    "0x05c6": "Qualcomm",
    "0x1782": "Unisoc",
    "0x19d2": "ZTE"
}

ANDROID_KEYWORDS = [
    "android", "galaxy", "pixel", "redmi", "xiaomi", "poco", "huawei", "honor",
    "oneplus", "oppo", "vivo", "realme", "motorola", "moto ", "sony xperia",
    "xperia", "infinix", "tecno", "itel", "nexus", "samsung"
]

def find_adb_executable() -> Optional[str]:
    import shutil
    found = shutil.which("adb")
    if found:
        return found
    candidates = [
        os.path.expanduser("~/Library/Android/sdk/platform-tools/adb"),
        "/opt/homebrew/bin/adb",
        "/usr/local/bin/adb",
        "C:\\Android\\platform-tools\\adb.exe",
        os.path.expandvars("%LOCALAPPDATA%\\Android\\Sdk\\platform-tools\\adb.exe"),
        os.path.expandvars("%PROGRAMFILES%\\Android\\platform-tools\\adb.exe"),
        "/usr/bin/adb",
        "/snap/bin/adb"
    ]
    for c in candidates:
        if os.path.exists(c) and os.access(c, os.X_OK):
            return c
    return None

find_adb = find_adb_executable

def detect_connected_android_devices() -> List[Dict[str, Any]]:
    """
    Detects Android smartphones & tablets connected via USB.
    1. Fast ADB query (adb devices -l) with support for model extraction & direct push
    2. Native OS hardware bus query (macOS SPUSBHostDataType/SPUSBDataType, Windows PnP, Linux lsusb)
    """
    devices: List[Dict[str, Any]] = []
    seen_serials = set()

    # 1. Fast ADB query (Instant, 0.05s)
    adb_bin = find_adb_executable()
    if adb_bin:
        try:
            p = run_silent_cmd([adb_bin, "devices", "-l"], capture_output=True, text=True, timeout=1.5)
            lines = p.stdout.strip().splitlines()
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                parts = line.split()
                serial = parts[0]
                state = parts[1] if len(parts) > 1 else "unknown"
                seen_serials.add(serial.lower())

                model = ""
                product = ""
                device_code = ""
                for item in parts[2:]:
                    if item.startswith("model:"):
                        model = item.split(":", 1)[1].replace("_", " ")
                    elif item.startswith("product:"):
                        product = item.split(":", 1)[1]
                    elif item.startswith("device:"):
                        device_code = item.split(":", 1)[1]

                display_name = model or product or device_code or f"Android Device ({serial})"
                brand = "Android"
                for kw in ["Samsung", "Pixel", "Xiaomi", "Redmi", "POCO", "Huawei", "OnePlus", "Oppo", "Vivo", "Realme", "Motorola", "Sony"]:
                    if kw.lower() in display_name.lower():
                        brand = kw
                        break

                devices.append({
                    "id": serial,
                    "name": display_name,
                    "model": display_name,
                    "platform": "android",
                    "icon": "🤖",
                    "os": "Android",
                    "manufacturer": brand,
                    "serial": serial,
                    "connection": "USB-C / Cable",
                    "status": "connected" if state == "device" else state,
                    "can_adb_sync": (state == "device")
                })
        except Exception:
            pass

    # 2. Native hardware detection
    if CURRENT_OS == "Darwin":
        import json
        for dt in ["SPUSBHostDataType", "SPUSBDataType"]:
            try:
                p = subprocess.run(["system_profiler", dt, "-json"], capture_output=True, text=True, timeout=4)
                if p.returncode == 0:
                    data = json.loads(p.stdout)
                    def traverse(node):
                        if isinstance(node, list):
                            for item in node: traverse(item)
                        elif isinstance(node, dict):
                            name = node.get("_name", "")
                            vendor_name = node.get("USBDeviceKeyVendorName", "") or node.get("manufacturer", "")
                            vendor_id = (node.get("USBDeviceKeyVendorID", "") or "").lower()
                            serial = node.get("USBDeviceKeySerialNumber", "") or node.get("serial_num", "")
                            if serial == "Not Provided":
                                serial = ""

                            is_android = False
                            brand = ""
                            if vendor_id in ANDROID_VENDORS:
                                is_android = True
                                brand = ANDROID_VENDORS[vendor_id]
                            else:
                                combined = f"{name} {vendor_name}".lower()
                                for kw in ANDROID_KEYWORDS:
                                    if kw in combined:
                                        is_android = True
                                        brand = vendor_name or kw.capitalize()
                                        break

                            if is_android and not any(ign in name.lower() for ign in ["hub", "receiver", "soundbar", "mouse", "keyboard", "apple", "iphone", "ipad"]):
                                if not serial or serial.lower() not in seen_serials:
                                    display_name = name if name not in ["Unnamed Device", "Android"] else f"{brand} Android Device"
                                    devices.append({
                                        "id": serial or name,
                                        "name": display_name,
                                        "model": display_name,
                                        "platform": "android",
                                        "icon": "🤖",
                                        "os": "Android",
                                        "manufacturer": brand or vendor_name or "Android",
                                        "serial": serial,
                                        "connection": "USB-C / Cable",
                                        "status": "connected",
                                        "can_adb_sync": False
                                    })
                                    if serial:
                                        seen_serials.add(serial.lower())

                            for k in ["_items", "_subitems"]:
                                if k in node: traverse(node[k])
                            for v in node.values():
                                if isinstance(v, (list, dict)):
                                    traverse(v)
                    traverse(data)
                    if devices:
                        break
            except Exception:
                pass
    elif CURRENT_OS == "Windows":
        # Only query PnP fallback if no ADB devices were found, and cache for 15 seconds to prevent spamming
        global _last_win_pnp_scan, _cached_win_pnp_devices
        now = time.time()
        if not devices:
            if now - _last_win_pnp_scan > 15.0:
                _cached_win_pnp_devices = []
                try:
                    ps_cmd = 'Get-PnpDevice -Status OK -ErrorAction SilentlyContinue | Where-Object { $_.PNPClass -in @("WPD", "USB") } | Select-Object -ExpandProperty FriendlyName'
                    p = run_silent_cmd(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=3)
                    if p.returncode == 0:
                        for line in p.stdout.splitlines():
                            line = line.strip()
                            if not line: continue
                            for kw in ANDROID_KEYWORDS:
                                if kw in line.lower() and not any(ign in line.lower() for ign in ["hub", "controller", "mouse", "keyboard"]):
                                    _cached_win_pnp_devices.append({
                                        "id": line,
                                        "name": line,
                                        "model": line,
                                        "platform": "android",
                                        "icon": "🤖",
                                        "os": "Android",
                                        "manufacturer": "Android",
                                        "serial": "",
                                        "connection": "USB Cable",
                                        "status": "connected",
                                        "can_adb_sync": False
                                    })
                                    break
                except Exception:
                    pass
                _last_win_pnp_scan = now
            devices.extend(_cached_win_pnp_devices)
    elif CURRENT_OS == "Linux":
        try:
            p = subprocess.run(["lsusb"], capture_output=True, text=True, timeout=3)
            if p.returncode == 0:
                for line in p.stdout.splitlines():
                    for kw in ANDROID_KEYWORDS:
                        if kw in line.lower():
                            parts = line.split(":", 2)
                            name = parts[-1].strip() if len(parts) > 2 else line
                            devices.append({
                                "id": name,
                                "name": name,
                                "model": name,
                                "platform": "android",
                                "icon": "🤖",
                                "os": "Android",
                                "manufacturer": "Android",
                                "serial": "",
                                "connection": "USB Cable",
                                "status": "connected",
                                "can_adb_sync": False
                            })
                            break
        except Exception:
            pass

    return devices

def detect_all_connected_mobile_devices() -> List[Dict[str, Any]]:
    """Detects both iOS (iPhone/iPad) and Android smartphones."""
    ios_devs = detect_connected_ios_devices()
    android_devs = detect_connected_android_devices()
    return ios_devs + android_devs

def sync_to_android_device(device_id: Optional[str] = None, file_paths: Optional[List[str]] = None, playlist_name: str = "Mazekty") -> Dict[str, Any]:
    """
    Syncs selected tracks or entire downloaded playlist to connected Android device.
    Uses ADB push directly to /sdcard/Music/{playlist_name}/ and requests media scan.
    """
    adb_bin = find_adb_executable()
    if not adb_bin:
        return {
            "success": False,
            "message": "محرك ADB غير متوفر لنقل الكابل المباشر. يمكنك استخدام AirSync اللاسلكي أعلاه للتحميل الفوري على الأندرويد!"
        }

    target_id = device_id
    if not target_id:
        devs = detect_connected_android_devices()
        adb_devs = [d for d in devs if d.get("can_adb_sync")]
        if not adb_devs:
            if devs:
                return {
                    "success": False,
                    "requires_auth": True,
                    "message": "تم كشف هاتف الأندرويد، ولكن يرجى تفعيل 'تصحيح أخطاء USB' (USB Debugging) في إعدادات المطور بالهاتف لتفعيل النقل المباشر، أو استخدم AirSync."
                }
            return {
                "success": False,
                "message": "لم يتم العثور على هاتف أندرويد متصل. تأكد من توصيل الكابل واختيار 'نقل الملفات'."
            }
        target_id = adb_devs[0]["id"]

    target_files = file_paths
    if not target_files:
        default_dir = get_default_download_dir()
        if os.path.isdir(default_dir):
            target_files = [
                os.path.join(default_dir, f) for f in os.listdir(default_dir)
                if f.lower().endswith(('.mp3', '.m4a', '.flac', '.wav', '.mp4'))
            ]

    if not target_files:
        return {"success": False, "message": "لا توجد ملفات صوتية لتحميلها. قم بتحميل بعض المقاطع أولاً!"}

    clean_playlist = re.sub(r'[^\w\s-]', '', playlist_name).strip() or "Mazekty"
    remote_dir = f"/sdcard/Music/{clean_playlist}"

    try:
        run_silent_cmd([adb_bin, "-s", target_id, "shell", "mkdir", "-p", remote_dir], capture_output=True, timeout=5)

        synced = 0
        for fpath in target_files:
            if os.path.isfile(fpath):
                fname = os.path.basename(fpath)
                p = run_silent_cmd([adb_bin, "-s", target_id, "push", fpath, f"{remote_dir}/{fname}"], capture_output=True, text=True, timeout=30)
                if p.returncode == 0:
                    synced += 1
                    run_silent_cmd([
                        adb_bin, "-s", target_id, "shell", "am", "broadcast",
                        "-a", "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
                        "-d", f"file://{remote_dir}/{fname}"
                    ], capture_output=True, timeout=5)

        return {
            "success": True,
            "synced_count": synced,
            "playlist": clean_playlist,
            "destination": remote_dir,
            "message": f"تم نقل {synced} مقطع صوتي بنجاح إلى مجلد Music/{clean_playlist} على هاتف الأندرويد!"
        }
    except Exception as e:
        return {"success": False, "message": f"خطأ أثناء النقل للأندرويد: {str(e)}"}

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
            p = run_silent_cmd(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
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
