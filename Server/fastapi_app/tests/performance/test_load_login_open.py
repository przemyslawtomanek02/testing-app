from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def load_home(self):
        self.client.get("/")

    @task
    def create_guest_session(self):
        self.client.post("/api/new_user", json={
            "name": "Load",
            "surname": "Tester",
            "index": 99999
        })
