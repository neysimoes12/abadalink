import requests
import json

URL = "http://localhost:8000/admin/options"

def test_create(name, circuit):
    payload = {
        "category": "BLOCO",
        "name": name,
        "default_circuit": circuit
    }
    print(f"Testing with name='{name}', default_circuit={repr(circuit)}")
    try:
        res = requests.post(URL, json=payload)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

if __name__ == "__main__":
    test_create("TestBloco_Null", None)
    test_create("TestBloco_Empty", "")
