import requests

URL = "http://localhost:8000/users/register"

def test_register():
    payload = {
        "name": "Test User",
        "email": "test_registerV2@test.com",
        "cpf": "999.999.999-99"
    }
    try:
        res = requests.post(URL, json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_register()
