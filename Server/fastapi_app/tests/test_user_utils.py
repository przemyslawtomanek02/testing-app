import pytest
from unittest.mock import AsyncMock
from types import SimpleNamespace

from fastapi_app.routes.users.user_utils import calculate_points


# -------------------------
# Helpers
# -------------------------

class FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def scalar_one(self):
        return self._value

    def one_or_none(self):
        return self._value

    def all(self):
        return self._value


class FakeAsyncSession:
    def __init__(self, responses):
        """
        responses = lista wartości zwracanych kolejno przez execute()
        """
        self.responses = responses
        self.execute = AsyncMock(side_effect=[FakeResult(r) for r in responses])


def make_payload(**kwargs):
    return SimpleNamespace(**kwargs)


# -------------------------
# TESTS
# -------------------------

@pytest.mark.asyncio
async def test_single_choice_correct():
    db = FakeAsyncSession([
        "scheme1",  # TestInstance.scheme_id
        SimpleNamespace(  # GradingScheme
            partial_credit=False,
            penalize_wrong=False,
            penalty_per_wrong=0,
            allow_negative_points=False
        ),
        (1.0, {}),  # Question.points_value, extra_data
        1  # count correct answers
    ])

    payload = make_payload(
        test_instance_id="ti1",
        question_id="q1",
        question_type="SingleChoice",
        user_response=[{"answer_id": "a1"}]
    )

    score = await calculate_points(db, payload)
    assert score == 1.0


@pytest.mark.asyncio
async def test_single_choice_wrong_with_penalty():
    db = FakeAsyncSession([
        "scheme1",
        SimpleNamespace(
            partial_credit=False,
            penalize_wrong=True,
            penalty_per_wrong=0.5,
            allow_negative_points=False
        ),
        (1.0, {}),
        0  # wrong answer
    ])

    payload = make_payload(
        test_instance_id="ti1",
        question_id="q1",
        question_type="SingleChoice",
        user_response=[{"answer_id": "bad"}]
    )

    score = await calculate_points(db, payload)
    assert score == 0.0  # penalty, ale brak punktów ujemnych


@pytest.mark.asyncio
async def test_multiple_choice_partial_credit():
    db = FakeAsyncSession([
        "scheme1",
        SimpleNamespace(
            partial_credit=True,
            penalize_wrong=False,
            penalty_per_wrong=0,
            allow_negative_points=False
        ),
        (2.0, {}),
        [
            ("a1", True),
            ("a2", False),
            ("a3", True)
        ]
    ])

    payload = make_payload(
        test_instance_id="ti1",
        question_id="q1",
        question_type="MultipleChoice",
        user_response=[
            {"answer_id": "a1", "user_answer": "True"},
            {"answer_id": "a2", "user_answer": "False"},
            {"answer_id": "a3", "user_answer": "False"}  # jeden błąd
        ]
    )

    score = await calculate_points(db, payload)
    assert score == pytest.approx(2 * (2 / 3), 0.01)


@pytest.mark.asyncio
async def test_drag_and_drop_order_partial():
    db = FakeAsyncSession([
        "scheme1",
        SimpleNamespace(
            partial_credit=True,
            penalize_wrong=False,
            penalty_per_wrong=0,
            allow_negative_points=False
        ),
        (3.0, {"correct_order": ["a", "b", "c"]})
    ])

    payload = make_payload(
        test_instance_id="ti1",
        question_id="q1",
        question_type="DragAndDropOrder",
        user_response=[
            {"answer_id": "a"},
            {"answer_id": "x"},
            {"answer_id": "c"}
        ]
    )

    score = await calculate_points(db, payload)
    assert score == pytest.approx(2.0, 0.01)


@pytest.mark.asyncio
async def test_rating_correct_value():
    db = FakeAsyncSession([
        "scheme1",
        SimpleNamespace(
            partial_credit=False,
            penalize_wrong=False,
            penalty_per_wrong=0,
            allow_negative_points=False
        ),
        (1.0, {
            "correct_enabled": True,
            "use_range": False,
            "correct_value": 4
        })
    ])

    payload = make_payload(
        test_instance_id="ti1",
        question_id="q1",
        question_type="Rating",
        user_response=[{"chosen_value": 4}]
    )

    score = await calculate_points(db, payload)
    assert score == 1.0


@pytest.mark.asyncio
async def test_fill_in_the_blank_full_correct():
    db = FakeAsyncSession([
        "scheme1",
        SimpleNamespace(
            partial_credit=False,
            penalize_wrong=False,
            penalty_per_wrong=0,
            allow_negative_points=False
        ),
        (2.0, [
            {"type": "text", "value": "Ala"},
            {"type": "blank", "correct_answer_id": "a1"},
            {"type": "text", "value": "ma kota"}
        ])
    ])

    payload = make_payload(
        test_instance_id="ti1",
        question_id="q1",
        question_type="FillInTheBlank",
        user_response=[
            {"type": "text", "value": "Ala"},
            {"type": "answer", "answer_id": "a1"},
            {"type": "text", "value": "ma kota"}
        ]
    )

    score = await calculate_points(db, payload)
    assert score == 2.0
