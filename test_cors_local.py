import requests
import sys

def test_cors():
    url = "http://localhost:8000/market/my-matches"
    origin = "http://localhost:5177"
    
    print(f"Testing CORS for {url} from Origin {origin}...")
    
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "GET"
    }
    
    try:
        # 1. Test OPTIONS (Preflight)
        print("\n--- 1. Testing OPTIONS Preflight ---")
        response = requests.options(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Headers:")
        for k, v in response.headers.items():
            print(f"  {k}: {v}")
                
        # 2. Test GET (Actual Request)
        print("\n--- 2. Testing GET Request ---")
        response = requests.get(url, headers={"Origin": origin})
        print(f"Status Code: {response.status_code}")
        print("Headers:")
        for k, v in response.headers.items():
            print(f"  {k}: {v}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_cors()
