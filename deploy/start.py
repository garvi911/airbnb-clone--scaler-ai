"""Run both required runtimes with a persistent SQLite volume."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[1] if Path(__file__).parent.name == 'deploy' else Path(__file__).parent
backend = root / 'backend'
subprocess.run([sys.executable, '-m', 'app.seed'], cwd=backend, check=True)
processes = [
    subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], cwd=backend),
    subprocess.Popen(['node', 'server.js'], cwd=root / 'frontend', env={**os.environ, 'HOSTNAME': '0.0.0.0'}),
]

def stop(*_):
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()

signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    while all(process.poll() is None for process in processes):
        time.sleep(1)
finally:
    stop()
sys.exit(next((p.returncode for p in processes if p.returncode), 0))
