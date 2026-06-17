import pytest
from unittest.mock import MagicMock, patch
from fastapi_app.utils.helpers import generate_id, filter_extra_data, build_question_structure

def test_generate_id():
    uid = generate_id()
    assert isinstance(uid, str)
    assert len(uid) == 26  # ULID length

def test_filter_extra_data_admin():
    data = {"secret": "value", "public": "value"}
    result = filter_extra_data("Any", data, include_admin_fields=True)
    assert result == data

def test_filter_extra_data_rating_safe():
    data = {"available_range": [1, 5], "unsafe": "value"}
    result = filter_extra_data("Rating", data, include_admin_fields=False)
    assert "available_range" in result
    assert "unsafe" not in result

def test_filter_extra_data_other_type():
    data = {"some": "data"}
    result = filter_extra_data("Open", data, include_admin_fields=False)
    assert result == data

def test_build_question_structure_flat():
    data = [
        {
            "question_id": "q1",
            "question_text": "Q1",
            "question_type": "Open",
            "extra_data": '{"test": 1}',
            "points_value": 1
        }
    ]
    result = build_question_structure(data)
    assert len(result) == 1
    assert result[0]["question_id"] == "q1"
    assert result[0]["extra_data"] == {"test": 1}

def test_build_question_structure_orm_mock():
    class FakeTI:
        pass

    with patch("Server.fastapi_app.utils.helpers.TI", new=FakeTI):
        fake_ti = FakeTI()
        mock_q = MagicMock()
        mock_q.question_id = "q1"
        mock_q.question_text = "Q1"
        mock_q.question_type = "Rating"
        mock_q.extra_data = {"available_range": 10}
        mock_q.points_value = 5
        mock_q.answers = []
        mock_q.image_path = None
        mock_q.is_active = True
        
        fake_ti.test = MagicMock()
        fake_ti.test.questions = [mock_q]

        result = build_question_structure(fake_ti)
        assert len(result) == 1
        assert result[0]["question_id"] == "q1"
