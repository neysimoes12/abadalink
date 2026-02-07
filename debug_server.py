import os
import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello from Minimal Debug Server", "env": dict(os.environ)}

@app.get("/health")
def health():
    return {"status": "ok", "message": "Minimal server is running"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting minimal debug server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
