from datetime import datetime
from pydantic import BaseModel, computed_field, Field, ConfigDict
from typing import List, Optional, Dict, Any, Union


# -------------------------------------------------------------------
# Ogólna odpowiedź statusowa
# -------------------------------------------------------------------

class StatusResponse(BaseModel):
    """Ogólna odpowiedź statusu dla prostych operacji."""
    status: str
    message: str


# -------------------------------------------------------------------
# AUTH
# -------------------------------------------------------------------

class LoginCredentials(BaseModel):
    """Uniwersalny model dla danych logowania (login/hasło)."""
    login: str
    password: str


class UserCreateOpen(BaseModel):
    """Dane wejściowe dla tworzenia użytkownika w trybie otwartym."""
    name: str
    surname: str
    index: Optional[int] = None


class NewPasswordSchema(BaseModel):
    new_password: str


class PasswordChange(BaseModel):
    """Model do zmiany hasła."""
    old_password: str
    new_password: str


class AdminStatus(BaseModel):
    is_admin: bool


class RedirectResponse(BaseModel):
    redirect: bool


# -------------------------------------------------------------------
# USER
# -------------------------------------------------------------------


class UserProfile(BaseModel):
    name: Optional[str] = None
    surname: Optional[str] = None
    index: Optional[int] = None
    email: Optional[str] = None


class UserView(BaseModel):
    user_id: str
    login: str
    role: str
    name: Optional[str] = None
    surname: Optional[str] = None
    user_index: Optional[int] = None
    email: Optional[str] = None
    avatar_path: Optional[str] = None
    created_at: datetime

    @computed_field
    @property
    def photo_url(self) -> Optional[str]:
        if self.avatar_path:
            return f"/avatars/{self.avatar_path}"
        return None

    model_config = ConfigDict(from_attributes=True)


class UserCreateForAdmin(BaseModel):
    login: str
    password: str
    role: str
    name: Optional[str] = None
    surname: Optional[str] = None
    user_index: Optional[int] = None
    email: Optional[str] = None

class AdminLoginResponse(BaseModel):
    redirect: bool
    admin: UserView

# -------------------------------------------------------------------
# TEST & QUESTIONS
# -------------------------------------------------------------------
class MatchingAnswerDetail(BaseModel):
    text: str
    answer_id: Optional[str] = None

class AnswerCreate(BaseModel):
    id: Any
    answer_id: Optional[str] = None
    text: Optional[str] = None
    is_correct: Optional[bool] = None
    left: Optional[Union[MatchingAnswerDetail, str]] = None
    right: Optional[Union[MatchingAnswerDetail, str]] = None


class QuestionCreateAndEdit(BaseModel):
    """
    Schemat dla obiektu pytania, który jest przesyłany jako string JSON w formularzu.
    """
    question: str
    type: str
    points_value: int = 1
    extra_data: Union[Dict[str, Any], List[Dict[str, Any]]] = {}
    answers: List[AnswerCreate]
    question_id: Optional[str] = None


class TestCreate(BaseModel):
    """Schemat do tworzenia lub pełnej aktualizacji całego testu."""
    test_name: str
    test_description: str
    questions: List[QuestionCreateAndEdit]


class AnswerUser(BaseModel):
    """Model odpowiedzi (bez informacji o poprawności) dla użytkownika."""
    answer_id: str
    text: str
    match_id: Optional[str] = None
    side: Optional[str] = None


class QuestionUser(BaseModel):
    """Model pytania dla użytkownika (bez informacji o poprawności)."""
    question_id: str
    question: str
    type: str
    image: Optional[str] = None
    extra_data: Union[Dict[str, Any], List[Dict[str, Any]]] = {}
    points_value: int
    answers: List[AnswerUser]


class TestDataInternal(BaseModel):
    """
    Wewnętrzny model do walidacji surowych danych testu pobieranych z bazy.
    Używany przez funkcje pomocnicze, zanim dane zostaną w pełni przetworzone.
    """
    test_name: str
    test_description: Optional[str] = None
    test_time: int
    instance_name: str
    num_questions: int
    questions: List[QuestionUser]


class TestStartResponse(BaseModel):
    """Główna odpowiedź przy rozpoczynaniu lub wznawianiu testu."""
    test_name: str
    test_description: str
    test_time: int
    remaining_time_seconds: Optional[int] = None
    instance_name: str
    max_score_for_activity: float
    questions: List[QuestionUser]
    user_activity_id: str


class RedirectToResultsResponse(BaseModel):
    """Odpowiedź, gdy test jest już skończony i należy przekierować do wyników."""
    message: str
    redirectToResults: bool


class AnswerSubmissionResponse(BaseModel):
    """Prosta odpowiedź po wysłaniu odpowiedzi."""
    status: str
    points_collected: float


class UserAnswerPayload(BaseModel):
    """Dane wejściowe dla odpowiedzi użytkownika na pojedyncze pytanie."""
    test_instance_id: str
    question_id: str
    user_response: Any
    question_number: int
    question_type: str


# -------------------------------------------------------------------
# RESULTS
# -------------------------------------------------------------------

class QuestionResultDetail(BaseModel):
    """Szczegółowy model wyniku dla pojedynczego pytania."""
    question_id: str
    question_text: str
    question_type: str
    points_value: int
    points_collected: float
    user_response: Any
    answers: Any
    correct_answers: Any
    extra_data: Union[Dict[str, Any], List[Dict[str, Any]]]


class UserActivityResultDetail(BaseModel):
    """Kompletny model ze szczegółowymi wynikami testu dla jednego użytkownika."""
    user_name: str
    user_surname: Optional[str] = None
    user_index: Optional[int] = None
    instance_name: str
    user_score: float
    max_score_for_activity: float
    questions: List[QuestionResultDetail]


class UserHistoryInstance(BaseModel):
    """Model dla pojedynczej instancji w historii testów użytkownika."""
    activity_id: str
    user_id: str
    instance_id: Optional[str] = None
    instance_name: str
    score: Optional[float]
    max_score: Optional[float]
    is_finished: bool
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class UniqueUserResult(BaseModel):
    """
    Uproszczony model reprezentujący unikalnego użytkownika
    na podstawie jego ostatniej aktywności.
    """

    activity_id: str
    user_id: str
    user_name: str
    user_surname: str
    user_index: Optional[int] = None
    last_activity_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InstanceParticipantResult(BaseModel):
    """Model dla pojedynczego uczestnika na liście w widoku instancji."""
    activity_id: str
    user_name: str
    user_surname: str
    user_id: str
    user_index: Optional[int] = None
    score: Optional[float] = None
    max_score: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class QuestionResult(BaseModel):
    """Szczegółowy model wyniku dla pojedynczego pytania po zakończeniu testu."""
    question_id: str
    question_text: str
    question_type: str
    points_value: int
    points_collected: float
    user_response: Any
    answers: Any
    correct_answers: Any
    extra_data: Union[Dict[str, Any], List[Dict[str, Any]]]
    instance_name: Optional[str] = None

# -------------------------------------------------------------------
# INSTANCES & GRADING
# -------------------------------------------------------------------


class InstanceInfo(BaseModel):
    """Podstawowe informacje o aktywnej instancji testu dla użytkownika."""
    instance_id: str
    test_id: str
    is_active: bool
    test_time: int
    instance_name: str
    num_questions: int

    model_config = ConfigDict(from_attributes=True)


class InstanceBase(BaseModel):
    """Wspólne, podstawowe pola dla każdej instancji testu."""
    test_id: str
    is_active: bool
    test_time: int
    instance_name: str
    num_questions: int


class InstanceCreate(InstanceBase):
    """Dane wejściowe do tworzenia instancji."""
    scheme_id: str
    use_fixed_question_pool: bool


class InstanceStatusUpdate(BaseModel):
    """Dane wejściowe do zmiany statusu aktywności instancji."""
    is_active: bool


class InstanceDetail(BaseModel):
    """Model odpowiedzi ze szczegółami instancji testu."""
    instance_id: str
    test_id: str
    is_active: bool
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    test_time: int
    instance_name: str
    num_questions: int
    use_fixed_question_pool: bool
    test_name: str

    model_config = ConfigDict(from_attributes=True)


class InstanceAdminDetail(BaseModel):
    """Model odpowiedzi ze szczegółami instancji dla panelu admina."""
    instance_id: str
    instance_name: str
    is_active: bool
    created_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    participants_count: Optional[int] = None
    avg_score: Optional[float] = None
    max_score: Optional[float] = None
    completion_ratio: Optional[float] = None


    model_config = ConfigDict(from_attributes=True)


class GradingThreshold(BaseModel):
    """Model dla pojedynczego progu w schemacie oceniania."""
    percentage_min: float
    percentage_max: float
    grade: int


class GradingSchemeBase(BaseModel):
    """Podstawowe pola dla schematu oceniania."""
    name: str
    description: Optional[str] = None
    scale_type: str
    partial_credit: bool
    penalize_wrong: bool
    penalty_per_wrong: float
    allow_negative_points: bool

class GradingSchemeCreate(GradingSchemeBase):
    """Schemat do tworzenia/aktualizacji schematu, zawiera listę progów."""
    grading_thresholds: List[GradingThreshold]

class GradingScheme(GradingSchemeBase):
    """Schemat reprezentujący schemat w bazie danych (z ID)."""
    scheme_id: str

    model_config = ConfigDict(from_attributes=True)


class GradingSchemeDetail(GradingScheme):
    """Pełny schemat ze szczegółami, zawierający również progi."""
    grading_thresholds: List[GradingThreshold] = Field(
        default_factory=list,
        validation_alias='thresholds',
        serialization_alias='grading_thresholds'
    )
class GradingForInstanceCreate(BaseModel):
    """Model odpowiedzi dla tworzenia instancji."""
    scheme_id: str
    name: str

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------------
# Tests Panel
# -------------------------------------------------------------------


class TestAdminSummary(BaseModel):
    """Model dla podsumowania testu na liście w panelu admina."""
    test_id: str
    name: str
    description: Optional[str]
    number_of_questions: int
    created_at: datetime
    instance_count: int

    model_config = ConfigDict(from_attributes=True)


class AnswerAdmin(BaseModel):
    """
    Model odpowiedzi na potrzeby panelu admina (np. przy edycji testu).
    Zawiera wszystkie pola, w tym 'side'.
    """
    answer_id: str
    text: Optional[str] = None
    is_correct: bool
    match_id: Optional[str] = None
    side: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class QuestionAdmin(BaseModel):
    """Model pytania na potrzeby panelu admina."""
    question_id: str
    question: str
    type: str
    points_value: int
    image: Optional[str] = None
    extra_data: Union[Dict[str, Any], List[Dict[str, Any]]]
    answers: List[AnswerAdmin]

    model_config = ConfigDict(from_attributes=True)


class TestAdminDetail(BaseModel):
    """Model odpowiedzi ze wszystkimi szczegółami testu dla panelu admina."""
    test_name: str
    test_description: str
    questions: List[QuestionAdmin]

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------------
# Search
# -------------------------------------------------------------------

class InstanceSearchResultDetail(InstanceBase):
    """Szczegółowe dane dla wyników wyszukiwania."""
    instance_id: str
    scheme_id: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserActivitySearchResult(BaseModel):
    """Model dla wyników wyszukiwania aktywności użytkowników."""
    activity_id: str
    user_id: str
    user_name: str
    user_surname: str
    user_index: Optional[int] = None
    instance_id: Optional[str] = None
    is_finished: Optional[bool] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    last_activity_at: Optional[datetime] = None

    instance_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------------
# Download
# -------------------------------------------------------------------


class DownloadRequest(BaseModel):
    """Dane wejściowe dla żądania pobrania pliku z wynikami."""
    id: str
    file_type: str = "pdf"
    entity_type: str = "instance"


# -------------------------------------------------------------------
# SYSTEM / CONFIG
# -------------------------------------------------------------------


class AppConfig(BaseModel):
    open_mode: bool
    dark_mode: bool
    use_index: bool

    model_config = ConfigDict(from_attributes=True)


class AppConfigFull(AppConfig):
    """Pełny model konfiguracji aplikacji z bazy danych."""
    id: int
    updated_at: datetime


class AppConfigUpdate(BaseModel):
    """Model do aktualizacji konfiguracji (wszystkie pola opcjonalne)."""
    open_mode: Optional[bool] = None
    dark_mode: Optional[bool] = None
    use_index: Optional[bool] = None