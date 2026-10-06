"""
Normalizacja odpowiedzi modelu LLM do formatu pytan uzywanego przez edytor testow.

Model NIE generuje identyfikatorow ani struktury extra_data - dostaje "plaski"
schemat (patrz LLM_TEST_SCHEMA) i wypelnia tylko tresc. Dopiero ten modul
buduje answers[].id, extra_data.parts, correct_order itd., czyli dokladnie to,
co przyjmuje "Import JSON" w panelu Create Test oraz endpoint /create_new_test.
"""
import re
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field, ValidationError

SUPPORTED_TYPES = [
    "SingleChoice",
    "MultipleChoice",
    "TrueFalse",
    "FillInTheBlank",
    "TypedFillInBlank",
    "DragAndDropOrder",
    "MatchingMultiple",
    "Rating",
]

# Schemat przekazywany modelowi (tool input / responseSchema / opis w promptcie).
LLM_TEST_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "test_name": {"type": "string", "description": "Krotka nazwa testu."},
        "test_description": {"type": "string", "description": "Jedno-dwa zdania opisu."},
        "questions": {
            "type": "array",
            "description": "Lista pytan.",
            "items": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": SUPPORTED_TYPES,
                        "description": "Typ pytania.",
                    },
                    "question": {
                        "type": "string",
                        "description": (
                            "Tresc polecenia. Dla TypedFillInBlank i FillInTheBlank "
                            "zdanie z ___ (trzy podkreslenia) w miejscu kazdej luki."
                        ),
                    },
                    "points_value": {
                        "type": "integer",
                        "description": "Liczba punktow za pytanie.",
                    },
                    "answers": {
                        "type": "array",
                        "description": (
                            "Odpowiedzi - to samo pole dla KAZDEGO typu pytania, "
                            "zmienia sie tylko jego znaczenie: "
                            "SingleChoice/MultipleChoice - warianty do wyboru; "
                            "TrueFalse - zdania do oceny; "
                            "TypedFillInBlank/FillInTheBlank - slowa do kolejnych luk ___; "
                            "DragAndDropOrder - elementy w poprawnej kolejnosci; "
                            "MatchingMultiple - lewa strona pary w 'text', prawa w 'match'. "
                            "Puste tylko dla Rating."
                        ),
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {
                                    "type": "string",
                                    "description": "Tresc odpowiedzi / zdania / slowa / elementu.",
                                },
                                "is_correct": {
                                    "type": "boolean",
                                    "description": (
                                        "Czy ta odpowiedz jest poprawna (SingleChoice, "
                                        "MultipleChoice) lub czy zdanie jest prawdziwe "
                                        "(TrueFalse). Dla pozostalych typow ustaw true."
                                    ),
                                },
                                "match": {
                                    "type": "string",
                                    "description": (
                                        "Tylko MatchingMultiple: prawa strona pary "
                                        "dopasowywana do 'text'."
                                    ),
                                },
                            },
                            "required": ["text", "is_correct"],
                        },
                    },
                    "scale_min": {"type": "integer", "description": "Tylko Rating: dolna granica skali."},
                    "scale_max": {"type": "integer", "description": "Tylko Rating: gorna granica skali."},
                    "scale_correct": {
                        "type": "integer",
                        "description": "Tylko Rating: poprawna wartosc (pomin w pytaniu ankietowym).",
                    },
                },
                "required": ["type", "question", "answers"],
            },
        },
    },
    "required": ["test_name", "questions"],
}


MAX_ANSWERS_PER_QUESTION = 8


def build_llm_test_schema(
    num_questions: int,
    types: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Schemat dopasowany do zamowienia: twardy limit liczby pytan i odpowiedzi
    oraz enum zawezony do typow wybranych przez wykladowce.

    Bez maxItems model moze dokladac kolejne pytania az do wyczerpania
    maxOutputTokens - wygląda to jak zawieszenie generowania.
    """
    import copy

    schema = copy.deepcopy(LLM_TEST_SCHEMA)
    questions = schema["properties"]["questions"]
    questions["minItems"] = 1
    questions["maxItems"] = max(1, int(num_questions))

    item = questions["items"]
    item["properties"]["answers"]["maxItems"] = MAX_ANSWERS_PER_QUESTION
    if types:
        allowed = [t for t in types if t in SUPPORTED_TYPES]
        if allowed:
            item["properties"]["type"]["enum"] = allowed

    return schema


class LlmOption(BaseModel):
    text: str = ""
    is_correct: bool = False


class LlmStatement(BaseModel):
    text: str = ""
    is_true: bool = False


class LlmPair(BaseModel):
    left: str = ""
    right: str = ""


class LlmQuestion(BaseModel):
    type: str
    question: str = ""
    points_value: Optional[float] = None
    options: List[LlmOption] = Field(default_factory=list)
    statements: List[LlmStatement] = Field(default_factory=list)
    blanks: List[str] = Field(default_factory=list)
    distractors: List[str] = Field(default_factory=list)
    items_in_correct_order: List[str] = Field(default_factory=list)
    pairs: List[LlmPair] = Field(default_factory=list)
    rating_min: Optional[int] = None
    rating_max: Optional[int] = None
    rating_correct: Optional[int] = None


class LlmTest(BaseModel):
    test_name: str = "AI Generated Test"
    test_description: str = ""
    questions: List[LlmQuestion] = Field(default_factory=list)


_TYPE_LOOKUP = {t.lower(): t for t in SUPPORTED_TYPES}
_TYPE_ALIASES = {
    "single": "SingleChoice",
    "singlechoicequestion": "SingleChoice",
    "multiple": "MultipleChoice",
    "multiplechoicequestion": "MultipleChoice",
    "truefalsequestion": "TrueFalse",
    "true_false": "TrueFalse",
    "fillintheblanks": "FillInTheBlank",
    "fill_in_the_blank": "FillInTheBlank",
    "typedfillintheblank": "TypedFillInBlank",
    "typed_fill_in_blank": "TypedFillInBlank",
    "draganddrop": "DragAndDropOrder",
    "drag_and_drop_order": "DragAndDropOrder",
    "ordering": "DragAndDropOrder",
    "matching": "MatchingMultiple",
    "matching_multiple": "MatchingMultiple",
    "scale": "Rating",
}


def _canonical_type(raw: str) -> Optional[str]:
    key = (raw or "").strip().lower()
    return _TYPE_LOOKUP.get(key) or _TYPE_ALIASES.get(key.replace(" ", "").replace("-", "_"))


def _choice_defaults() -> Dict[str, Any]:
    return {"timed_reveal": False, "reveal_delay": 3, "answer_time_limit": 15}


def _split_on_blanks(sentence: str, blank_count: int) -> Tuple[str, List[str]]:
    """
    Zwraca (tekst_bez_luk, segmenty). Akceptuje ___ oraz [[...]] / {{...}}
    jako znaczniki luki, bo modele czesto uzywaja tych drugich.
    """
    normalized = re.sub(r"\[\[.*?\]\]|\{\{.*?\}\}", "___", sentence or "")
    normalized = re.sub(r"_{3,}", "___", normalized)

    if "___" not in normalized and blank_count:
        # Model zapomnial znacznikow - doklejamy luki na koncu zdania.
        normalized = normalized.rstrip() + " ___" * blank_count

    segments = normalized.split("___")
    return normalized, segments


def _normalize_choice(q: LlmQuestion, qtype: str, warn) -> Optional[Dict[str, Any]]:
    options = [o for o in q.options if (o.text or "").strip()]
    if len(options) < 2 and q.statements:
        # Gemini potrafi wrzucic warianty wyboru do pola statements.
        options = [
            LlmOption(text=stmt.text, is_correct=stmt.is_true)
            for stmt in q.statements if (stmt.text or "").strip()
        ]
        if len(options) >= 2:
            warn("warianty odczytane z pola statements")
    if len(options) < 2:
        warn("za malo wariantow odpowiedzi")
        return None

    correct_count = sum(1 for o in options if o.is_correct)
    if correct_count == 0:
        options[0].is_correct = True
        warn("brak poprawnej odpowiedzi - oznaczono pierwsza, sprawdz recznie")
    if qtype == "SingleChoice" and correct_count > 1:
        seen = False
        for o in options:
            if o.is_correct and not seen:
                seen = True
            else:
                o.is_correct = False
        warn("wiele poprawnych w SingleChoice - zostawiono pierwsza")

    return {
        "question": q.question.strip(),
        "type": qtype,
        "answers": [
            {"id": str(i), "text": o.text.strip(), "is_correct": bool(o.is_correct)}
            for i, o in enumerate(options)
        ],
        "extra_data": _choice_defaults(),
        "points_value": q.points_value,
    }


def _normalize_true_false(q: LlmQuestion, warn) -> Optional[Dict[str, Any]]:
    statements = [s for s in q.statements if (s.text or "").strip()]
    if not statements:
        # Niektore modele wrzucaja zdania do options.
        statements = [
            LlmStatement(text=o.text, is_true=o.is_correct)
            for o in q.options
            if (o.text or "").strip()
        ]
    if not statements:
        warn("brak zdan do oceny")
        return None

    return {
        "question": q.question.strip() or "Oznacz, czy zdania sa prawdziwe.",
        "type": "TrueFalse",
        "answers": [
            {"id": str(i), "text": s.text.strip(), "is_correct": bool(s.is_true)}
            for i, s in enumerate(statements)
        ],
        "extra_data": {},
        "points_value": q.points_value,
    }


def _normalize_typed_blank(q: LlmQuestion, warn) -> Optional[Dict[str, Any]]:
    blanks = [b for b in q.blanks if (b or "").strip()]
    if not blanks:
        warn("brak poprawnych slow dla luk")
        return None

    sentence, segments = _split_on_blanks(q.question, len(blanks))
    gaps = len(segments) - 1
    if gaps != len(blanks):
        warn("liczba luk ___ (%d) != liczba odpowiedzi (%d)" % (gaps, len(blanks)))
        if gaps < len(blanks):
            blanks = blanks[:gaps] if gaps > 0 else blanks
            sentence, segments = _split_on_blanks(q.question, len(blanks))
            gaps = len(segments) - 1
        if gaps != len(blanks):
            return None

    parts: List[Dict[str, Any]] = []
    for i, segment in enumerate(segments):
        if segment:
            parts.append({"type": "text", "value": segment})
        if i < len(blanks):
            parts.append({"type": "blank", "correct_answer_id": str(i)})

    return {
        "question": sentence,
        "type": "TypedFillInBlank",
        "answers": [{"id": str(i), "text": b.strip()} for i, b in enumerate(blanks)],
        "extra_data": {"parts": parts},
        "points_value": q.points_value,
    }


def _normalize_drag_blank(q: LlmQuestion, warn) -> Optional[Dict[str, Any]]:
    blanks = [b for b in q.blanks if (b or "").strip()]
    if not blanks:
        warn("brak poprawnych slow dla luk")
        return None

    _, segments = _split_on_blanks(q.question, len(blanks))
    gaps = len(segments) - 1
    if gaps != len(blanks):
        warn("liczba luk ___ (%d) != liczba odpowiedzi (%d)" % (gaps, len(blanks)))
        return None

    # FillInTheBlank trzyma tekst jako pojedyncze slowa w extra_data,
    # a pole question to te slowa zlaczone spacjami (bez znacznikow luk).
    extra_data: List[Dict[str, Any]] = []
    words: List[str] = []
    for i, segment in enumerate(segments):
        for word in segment.split():
            extra_data.append({"type": "text", "value": word})
            words.append(word)
        if i < len(blanks):
            extra_data.append({"type": "blank", "correct_answer_id": str(i)})

    # Edytor wymaga, by liczba odpowiedzi rownala sie liczbie luk, wiec
    # ewentualne dystraktory z modelu sa ignorowane.
    answers = [{"id": str(i), "text": b.strip()} for i, b in enumerate(blanks)]

    return {
        "question": " ".join(words),
        "type": "FillInTheBlank",
        "answers": answers,
        "extra_data": extra_data,
        "points_value": q.points_value,
    }


def _normalize_order(q: LlmQuestion, warn) -> Optional[Dict[str, Any]]:
    items = [i for i in q.items_in_correct_order if (i or "").strip()]
    if len(items) < 2:
        warn("za malo elementow do uporzadkowania")
        return None

    return {
        "question": q.question.strip(),
        "type": "DragAndDropOrder",
        "answers": [{"id": str(i), "text": item.strip()} for i, item in enumerate(items)],
        "extra_data": {"correct_order": [str(i) for i in range(len(items))]},
        "points_value": q.points_value,
    }


def _normalize_matching(q: LlmQuestion, warn) -> Optional[Dict[str, Any]]:
    pairs = [p for p in q.pairs if (p.left or "").strip() and (p.right or "").strip()]
    if len(pairs) < 2:
        warn("za malo par do dopasowania")
        return None

    return {
        "question": q.question.strip(),
        "type": "MatchingMultiple",
        "answers": [
            {"id": str(i), "left": {"text": p.left.strip()}, "right": {"text": p.right.strip()}}
            for i, p in enumerate(pairs)
        ],
        # correct_order nie jest remapowane po stronie serwera, wiec nie
        # zapisujemy tu tymczasowych ID - para left/right nosi dopasowanie.
        "extra_data": {"correct_order": [], "hasCorrectOrder": False},
        "points_value": q.points_value,
    }


def _normalize_rating(q: LlmQuestion, warn) -> Optional[Dict[str, Any]]:
    low = q.rating_min if q.rating_min is not None else 1
    high = q.rating_max if q.rating_max is not None else 5
    if high <= low:
        high = low + 4
        warn("niepoprawna skala - ustawiono %d-%d" % (low, high))

    extra: Dict[str, Any] = {"available_range": [low, high], "correct_enabled": False}
    if q.rating_correct is not None and low <= q.rating_correct <= high:
        extra.update({"correct_enabled": True, "use_range": False, "correct_value": q.rating_correct})

    return {
        "question": q.question.strip(),
        "type": "Rating",
        "answers": [],
        "extra_data": extra,
        "points_value": q.points_value,
    }


# --- Tolerancyjne czytanie odpowiedzi modelu -------------------------------
# Modele mieszaja pola: warianty wyboru trafiaja do "statements", listy
# bywaja plaskimi stringami, a klucze nosza inne nazwy. Zamiast odrzucac
# takie pytanie, sprowadzamy je najpierw do naszego ksztaltu.

_ANSWER_LIST_KEYS = (
    "answers", "options", "choices", "statements", "variants",
    "items", "items_in_correct_order", "pairs", "blanks", "matches", "matching",
)
_TEXT_KEYS = ("text", "statement", "answer", "option", "content", "label", "value", "left", "term")
_CORRECT_KEYS = ("is_correct", "correct", "isCorrect", "is_true", "isTrue", "true")
_MATCH_KEYS = ("match", "right", "definition", "pair", "matched_with")


def _first_present(source: Dict[str, Any], keys) -> Any:
    for key in keys:
        value = source.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def _entry_text(entry: Any) -> str:
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict):
        value = _first_present(entry, _TEXT_KEYS)
        if isinstance(value, dict):
            value = _first_present(value, _TEXT_KEYS)
        return str(value) if value is not None else ""
    return str(entry) if entry is not None else ""


def _entry_flag(entry: Any) -> Optional[bool]:
    if isinstance(entry, dict):
        for key in _CORRECT_KEYS:
            if key in entry and entry[key] is not None:
                return bool(entry[key])
    return None


def _entry_match(entry: Any) -> str:
    if isinstance(entry, dict):
        value = _first_present(entry, _MATCH_KEYS)
        if isinstance(value, dict):
            value = _first_present(value, _TEXT_KEYS)
        return str(value) if value is not None else ""
    return ""


def _collect_answers(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Zbiera odpowiedzi niezaleznie od tego, w ktorym polu model je umiescil.
    Jedno pole answers[] w schemacie sprawia, ze modele nie maja w co chybic,
    ale starsze/inne dostawcy nadal przysylaja options/statements/pairs.
    """
    source = _first_present(raw, _ANSWER_LIST_KEYS)
    if not isinstance(source, list):
        return []

    entries: List[Dict[str, Any]] = []
    for item in source:
        text = _entry_text(item).strip()
        if not text:
            continue
        flag = _entry_flag(item)
        entries.append({
            "text": text,
            "is_correct": bool(flag) if flag is not None else False,
            "match": _entry_match(item).strip(),
        })
    return entries


def _apply_explicit_correct(raw: Dict[str, Any], options: List[Dict[str, Any]]) -> None:
    """Obsluguje warianty typu correct_index / correct_answer obok listy opcji."""
    if any(o["is_correct"] for o in options):
        return

    index = raw.get("correct_index")
    if index is None:
        index = raw.get("correct_option_index")
    if isinstance(index, int) and 0 <= index < len(options):
        options[index]["is_correct"] = True
        return

    expected = _first_present(raw, ("correct_answer", "correct_option", "correct"))
    if isinstance(expected, str):
        wanted = expected.strip().lower()
        for option in options:
            if option["text"].strip().lower() == wanted:
                option["is_correct"] = True
                return
        if len(wanted) == 1 and "a" <= wanted <= "z":
            position = ord(wanted) - ord("a")
            if position < len(options):
                options[position]["is_correct"] = True


def _coerce_raw_question(raw: Dict[str, Any], qtype: Optional[str]) -> Dict[str, Any]:
    """
    Sprowadza pytanie od modelu do pol, ktorych oczekuje LlmQuestion.
    Zrodlem jest zawsze jedna lista odpowiedzi - znaczenie zalezy od typu.
    """
    out = dict(raw)
    entries = _collect_answers(raw)

    out["options"] = []
    out["statements"] = []
    out["blanks"] = []
    out["items_in_correct_order"] = []
    out["pairs"] = []

    if qtype in ("SingleChoice", "MultipleChoice"):
        options = [{"text": e["text"], "is_correct": e["is_correct"]} for e in entries]
        _apply_explicit_correct(raw, options)
        out["options"] = options
    elif qtype == "TrueFalse":
        out["statements"] = [{"text": e["text"], "is_true": e["is_correct"]} for e in entries]
    elif qtype in ("TypedFillInBlank", "FillInTheBlank"):
        out["blanks"] = [e["text"] for e in entries]
    elif qtype == "DragAndDropOrder":
        out["items_in_correct_order"] = [e["text"] for e in entries]
    elif qtype == "MatchingMultiple":
        pairs = [
            {"left": e["text"], "right": e["match"]}
            for e in entries if e["match"]
        ]
        if not pairs:
            # Model moze przyslac pary jako osobne obiekty left/right.
            raw_pairs = _first_present(raw, ("pairs", "matches", "matching"))
            if isinstance(raw_pairs, list):
                for item in raw_pairs:
                    if isinstance(item, dict):
                        left = _entry_text(item).strip()
                        right = _entry_match(item).strip()
                        if left and right:
                            pairs.append({"left": left, "right": right})
        out["pairs"] = pairs

    # Skala: schemat uzywa scale_*, wewnatrz pracujemy na rating_*.
    for schema_key, internal_key in (
        ("scale_min", "rating_min"),
        ("scale_max", "rating_max"),
        ("scale_correct", "rating_correct"),
    ):
        value = raw.get(schema_key)
        if value is None:
            value = raw.get(internal_key)
        out[internal_key] = value if isinstance(value, int) else None

    return out


def _filled_fields(raw: Dict[str, Any]) -> List[str]:
    """Nazwy pol, ktore model faktycznie wypelnil - do komunikatow diagnostycznych."""
    if not isinstance(raw, dict):
        return []
    return [k for k, v in raw.items() if v not in (None, "", [], {})]


def normalize_llm_test(payload: Dict[str, Any], default_points: int = 1) -> Dict[str, Any]:
    """
    Waliduje plaski payload modelu i zamienia go na strukture testu
    zgodna z edytorem. Pytania, ktorych nie da sie uratowac, sa pomijane
    i raportowane w "warnings" - jedno zle pytanie nie psuje calej generacji.
    """
    payload = dict(payload or {})
    raw_questions = payload.get("questions") or []
    coerced: List[Any] = []
    raw_fields: List[List[str]] = []
    for raw in raw_questions:
        if isinstance(raw, dict):
            coerced.append(_coerce_raw_question(raw, _canonical_type(raw.get("type", ""))))
            raw_fields.append(_filled_fields(raw))
        else:
            coerced.append(raw)
            raw_fields.append([])
    payload["questions"] = coerced

    try:
        parsed = LlmTest.model_validate(payload)
    except ValidationError as exc:
        raise ValueError("Model zwrocil dane niezgodne ze schematem: %s" % exc.errors()[:3])

    warnings: List[str] = []
    questions: List[Dict[str, Any]] = []

    for index, raw_q in enumerate(parsed.questions, start=1):
        qtype = _canonical_type(raw_q.type)
        if not qtype:
            warnings.append("Pytanie %d: nieznany typ '%s' - pominieto." % (index, raw_q.type))
            continue
        if not (raw_q.question or "").strip() and qtype != "TrueFalse":
            warnings.append("Pytanie %d: puste polecenie - pominieto." % index)
            continue

        local: List[str] = []

        def warn(message: str) -> None:
            local.append(message)

        if qtype in ("SingleChoice", "MultipleChoice"):
            normalized = _normalize_choice(raw_q, qtype, warn)
        elif qtype == "TrueFalse":
            normalized = _normalize_true_false(raw_q, warn)
        elif qtype == "TypedFillInBlank":
            normalized = _normalize_typed_blank(raw_q, warn)
        elif qtype == "FillInTheBlank":
            normalized = _normalize_drag_blank(raw_q, warn)
        elif qtype == "DragAndDropOrder":
            normalized = _normalize_order(raw_q, warn)
        elif qtype == "MatchingMultiple":
            normalized = _normalize_matching(raw_q, warn)
        else:
            normalized = _normalize_rating(raw_q, warn)

        if normalized is None:
            reason = local[0] if local else "niekompletne dane"
            fields = raw_fields[index - 1] if index - 1 < len(raw_fields) else []
            detail = " (model przyslal pola: %s)" % ", ".join(fields) if fields else ""
            warnings.append(
                "Pytanie %d (%s): %s%s - pominieto." % (index, qtype, reason, detail)
            )
            continue

        normalized["points_value"] = max(
            1, int(round(normalized.get("points_value") or default_points))
        )
        questions.append(normalized)
        for message in local:
            warnings.append("Pytanie %d (%s): %s." % (len(questions), qtype, message))

    if not questions:
        raise ValueError(
            "Model nie zwrocil ani jednego poprawnego pytania. %s" % " ".join(warnings[:3])
        )

    return {
        "test_name": parsed.test_name.strip() or "AI Generated Test",
        "test_description": parsed.test_description.strip(),
        "questions": questions,
        "warnings": warnings,
    }
