import requests

BACKEND_URL = "https://web-production-ffe3.up.railway.app/market/listings"
ORIGIN = "https://abadalink.vercel.app"

def test_cors():
    print(f"Testing CORS for {BACKEND_URL} from origin {ORIGIN}")
    
    headers = {
        "Origin": ORIGIN,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type"
    }
    
    try:
        response = requests.options(BACKEND_URL, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:")
        for k, v in response.headers.items():
            if "access-control" in k.lower():
                print(f"  {k}: {v}")
                
        if response.headers.get("access-control-allow-origin") == ORIGIN:
            print("\nSUCCESS: CORS headers are correct!")
        else:
            print("\nFAILURE: CORS headers missing or incorrect.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_cors()
