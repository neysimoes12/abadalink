import os
import subprocess
import sys

port = os.environ.get("PORT", "8000")
cmd = [
    sys.executable, "-m", "gunicorn",
    "main:app",
    "-w", "4",
    "-k", "uvicorn.workers.UvicornWorker",
    "--bind", f"0.0.0.0:{port}"
]
subprocess.run(cmd)
