import redis
import json

r = redis.Redis(host="localhost", port=6379, db=0)
session_keys = r.keys("session:*")
print(session_keys)

for key in session_keys:
    session_data = r.get(key)
    print(session_data)


