import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def login():
    url = f"{BASE_URL}/auth/verify-otp"
    data = json.dumps({"email": "ney@gmail.com", "code": "123456"}).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_listings(token):
    url = f"{BASE_URL}/market/listings"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_chat_messages(token, partner_id):
    # Testing the NEW endpoint path
    url = f"{BASE_URL}/api/chat/{partner_id}"
    print(f"Testing URL: {url}")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        return json.loads(resp.read().decode("utf-8"))

try:
    print("Logging in...")
    auth_resp = login()
    token = auth_resp["tokens"]["access_token"]
    my_id = auth_resp["user"]["id"]
    
    print("Fetching listings...")
    listings = get_listings(token)
    partner = next((l for l in listings if l["seller_id"] != my_id), None)
    
    if partner:
        partner_id = partner["seller_id"]
        print(f"Testing chat with partner {partner_id}...")
        
        chat_data = get_chat_messages(token, partner_id)
        print("Success! JSON received.")
        print(json.dumps(chat_data, indent=2))
        
    else:
        print("No partner found to test with.")

except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print(e.read().decode("utf-8"))
except Exception as e:
    print(f"Error: {e}")
