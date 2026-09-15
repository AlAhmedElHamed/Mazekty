import os
import sys
import time
import threading
import socket
import uvicorn
import webbrowser

try:
    import webview
except ImportError:
    webview = None

def find_free_port(default_port=8000):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(('127.0.0.1', default_port)) != 0:
            return default_port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def start_server(host, port):
    from server import app
    uvicorn.run(app, host=host, port=port, log_level="warning")

def main():
    server_host = "0.0.0.0"
    port = find_free_port(8000)

    server_thread = threading.Thread(target=start_server, args=(server_host, port), daemon=True)
    server_thread.start()

    local_host = "127.0.0.1"
    url = f"http://{local_host}:{port}"
    for _ in range(50):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex((local_host, port)) == 0:
                    break
        except Exception:
            pass
        time.sleep(0.1)

    if webview:
        try:
            window = webview.create_window(
                title="Mazekty Pro",
                url=url,
                width=1120,
                height=860,
                min_size=(850, 650),
                background_color="#070a12",
                text_select=True,
                confirm_close=False
            )
            webview.start(debug=False)
            sys.exit(0)
        except Exception as e:
            print(f"Native webview fallback to browser: {e}")

    # Fallback to browser window
    webbrowser.open(url)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == "__main__":
    main()
