"""
Prospector — entry point do .exe
"""
import sys
import os

# OBRIGATÓRIO: redirecionar ANTES de qualquer import quando rodando como .exe
if getattr(sys, "frozen", False):
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

import multiprocessing
multiprocessing.freeze_support()


HOST = "127.0.0.1"
PORT = 8004
URL  = f"http://{HOST}:{PORT}"


def _port_in_use() -> bool:
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex((HOST, PORT)) == 0


def _kill_port():
    """Mata qualquer processo que esteja usando a porta (Windows)."""
    import ctypes
    try:
        import subprocess
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        for line in result.stdout.splitlines():
            if f":{PORT}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = int(parts[-1])
                if pid > 0:
                    subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                                   capture_output=True)
    except Exception:
        pass


def _open_browser():
    import time
    import webbrowser
    time.sleep(2.0)
    webbrowser.open(URL)


def _wait_server_ready():
    import time
    import socket
    for _ in range(40):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex((HOST, PORT)) == 0:
                return True
        time.sleep(0.25)
    return False


def main():
    try:
        import threading
        import webbrowser

        # Se já está rodando (processo anterior não fechou), mata e reinicia
        if _port_in_use():
            _kill_port()
            import time
            time.sleep(1.0)

        from backend.main import app
        import uvicorn

        threading.Thread(target=_open_browser, daemon=True).start()
        uvicorn.run(app, host=HOST, port=PORT, log_level="warning")

    except Exception:
        import traceback
        err = traceback.format_exc()

        if getattr(sys, "frozen", False):
            log_path = os.path.join(os.path.dirname(sys.executable), "error.log")
            try:
                with open(log_path, "w", encoding="utf-8") as f:
                    f.write(err)
            except Exception:
                pass

        import ctypes
        ctypes.windll.user32.MessageBoxW(
            0,
            f"Prospector falhou ao iniciar.\n\nVeja error.log na pasta do .exe.\n\n{err[-600:]}",
            "Erro de Inicialização",
            0x10,
        )


if __name__ == "__main__":
    main()
