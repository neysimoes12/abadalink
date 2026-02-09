import requests

URL = "https://web-production-ffe3.up.railway.app/health"

def test_health():
    try:
        resp = requests.get(URL, timeout=5)
        print(f"Health Check Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_health()
