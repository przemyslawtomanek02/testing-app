import pytest
from types import SimpleNamespace

from fastapi_app.routes.users.user_utils import calculate_points


class FakeResult:
    def __init__(self, *, scalar_one_or_none=None, one_or_none=None, all_rows=None, scalar_one=None):
        self._scalar_one_or_none = scalar_one_or_none
        self._one_or_none = one_or_none
        self._all_rows = all_rows
        self._scalar_one = scalar_one

    def scalar_one_or_none(self):
        return self._scalar_one_or_none

    def one_or_none(self):
        return self._one_or_none

    def all(self):
        return self._all_rows

    def scalar_one(self):
        return self._scalar_one


class FakeAsyncSession:
    """Fake AsyncSession, który zwraca kolejne wyniki w kolejności wywołań."""
    def __init__(self, results):
        self._results = list(results)
        self.calls = 0

    async def execute(self, stmt):
        self.calls += 1
        if not self._results:
            raise AssertionError("Za mało przygotowanych wyników FakeResult dla kolejnych db.execute(...)")
        return self._results.pop(0)


@pytest.mark.asyncio
async def test_calculate_points_multiplechoice_partial_credit_with_penalty():
    answer_data = SimpleNamespace(
        test_instance_id="01KANQAR6EZ7PVMFKWXZDPQT4D",
        question_id="01K3BESXWPZW38AYVFD6GZ2JF5",
        question_type="MultipleChoice",
        user_response=[
            {"answer_id": "01K7SWW4S15G4HFA46ZAPWFKVY", "user_answer": "True"},
            {"answer_id": "01K7SWW4S15BMCQRMCGTKPR66Q", "user_answer": "True"},
            {"answer_id": "01KF1FR4DPS55NYR9Z1668WQ9C", "user_answer": "True"},
        ],
        question_number=1,
    )

    # 1) TestInstance.scheme_id
    scheme_id = "scheme-123"

    # 2) GradingScheme
    scheme = SimpleNamespace(
        partial_credit=True,
        penalize_wrong=True,
        penalty_per_wrong=1.0,
        allow_negative_points=True,
    )

    # 3) Question.points_value, Question.extra_data
    q_row = (2.0, {})  # points_value=2

    # 4) Answer list (answer_id, is_correct)
    # Dwie poprawne + jedna błędna (ta trzecia)
    all_answers = [
        ("01K7SWW4S15G4HFA46ZAPWFKVY", True),
        ("01K7SWW4S15BMCQRMCGTKPR66Q", True),
        ("01KF1FR4DPS55NYR9Z1668WQ9C", False),
    ]

    db = FakeAsyncSession(results=[
        FakeResult(scalar_one_or_none=scheme_id),          # ti_stmt
        FakeResult(scalar_one_or_none=scheme),             # gs_stmt
        FakeResult(one_or_none=q_row),                     # q_stmt
        FakeResult(all_rows=all_answers),                  # ans_stmt
    ])

    score = await calculate_points(db, answer_data)

    # Wyliczenie:
    # correctly_marked=2, total=3 => (2/3)*2 -1 = 0.33
    assert score == 0.33
    assert db.calls == 4
