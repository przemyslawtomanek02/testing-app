from locust import HttpUser, task, between


class UserBehavior(HttpUser):
    wait_time = between(1, 2)

    # @task
    # def login_closed_mode(self):
    #     self.client.post(
    #         "/api/new_user",
    #         json={"login": "noppe", "password": "michal2003"}
    #     )

    # @task
    # def get_exams(self):
    #     self.client.get("/api/exams")
    #
    # @task
    # def get_activity(self):
    #     self.client.get("/api/user/activity/01KF1G4K2W6XZ2C2BJJAVQWRKA")

    # @task
    # def submit_multiple_choice_answer(self):
    #     payload = {
    #         "test_instance_id": "01KANQAR6EZ7PVMFKWXZDPQT4D",
    #         "question_id": "01K3BESXWPZW38AYVFD6GZ2JF5",
    #         "question_type": "MultipleChoice",
    #         "question_number": 1,
    #         "user_response": [
    #             {
    #                 "answer_id": "01K7SWW4S15G4HFA46ZAPWFKVY",
    #                 "user_answer": "True"
    #             },
    #             {
    #                 "answer_id": "01K7SWW4S15BMCQRMCGTKPR66Q",
    #                 "user_answer": "True"
    #             },
    #             {
    #                 "answer_id": "01KF1FR4DPS55NYR9Z1668WQ9C",
    #                 "user_answer": "True"
    #             }
    #         ]
    #     }
    #
    #     with self.client.post(
    #             "/api/user_answer",
    #             json=payload,
    #             name="POST /api/user_answer (MultipleChoice)",
    #             catch_response=True
    #     ) as response:
    #         if response.status_code != 200:
    #             response.failure(f"Failed to submit answer: {response.text}")
    #         else:
    #             response.success()
