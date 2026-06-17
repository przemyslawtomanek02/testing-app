import requests

url = "http://localhost:443/api/admin/create_admin"
headers = {"Content-Type": "application/json"}
data = {
    "name": "lysy",
    "password": "glaca800"
}

response = requests.post(url, json=data, headers=headers)

if response.status_code == 201:
    print("Admin created successfully:", response.json())
else:
    print("Error:", response.json())
