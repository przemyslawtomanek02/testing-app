from locust import HttpUser, task, between

class UserFlow(HttpUser):
    wait_time = between(0.5, 2)

    @task
    def get_instances(self):
        with self.client.get("/api/get_instances", catch_response=True) as res:
            if res.status_code != 200:
                res.failure("get_instances failed")
                return

            if "application/json" not in res.headers.get("content-type", ""):
                res.failure("Not JSON")
                return

            data = res.json()
            if not data:
                return

            self.instance_ids = [i["instance_id"] for i in data]
