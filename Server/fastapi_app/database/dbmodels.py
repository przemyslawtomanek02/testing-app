from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, UniqueConstraint
from sqlalchemy import JSON
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase
from typing import Optional, Union


class Base(DeclarativeBase):
    pass


class AppConfig(Base):
    __tablename__ = "app_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    dark_mode: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    open_mode: Mapped[bool] = mapped_column(Boolean, server_default="1", nullable=False)
    use_index: Mapped[bool] = mapped_column(Boolean, server_default="1", nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

class User(Base):
    __tablename__ = "Users"
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    login: Mapped[str] = mapped_column(String, index=True)
    password_hash: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String, nullable=False, default="user")
    name: Mapped[str] = mapped_column(String, nullable=True)
    surname: Mapped[str] = mapped_column(String, nullable=True)
    email: Mapped[str] = mapped_column(String, index=True, nullable=True)
    user_index: Mapped[int] = mapped_column(Integer, nullable=True)
    avatar_path: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    password_change_required: Mapped[bool] = mapped_column(
        Boolean, server_default="1", nullable=False
    )
    activities: Mapped[List["UserActivity"]] = relationship(
        "UserActivity",
        back_populates="user",
        primaryjoin="foreign(UserActivity.user_id) == User.user_id",
        viewonly=True
    )


class Test(Base):
    __tablename__ = "Tests"

    test_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    number_of_questions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    questions: Mapped[List["Question"]] = relationship("Question", back_populates="test", passive_deletes=True)
    instances: Mapped[List["TestInstance"]] = relationship("TestInstance", back_populates="test", passive_deletes=True)
    results: Mapped[List["Result"]] = relationship("Result", back_populates="test", passive_deletes=True)


class TestInstance(Base):
    __tablename__ = "TestInstances"

    instance_id: Mapped[str] = mapped_column(String, primary_key=True)

    test_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("Tests.test_id", ondelete="CASCADE")
    )
    scheme_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("Grading_schemes.scheme_id", ondelete="SET NULL")
    )

    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    test_time: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    instance_name: Mapped[str] = mapped_column(Text, default="Default Test Name")
    num_questions: Mapped[int] = mapped_column(Integer, default=0)
    use_fixed_question_pool: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    fixed_question_ids: Mapped[Optional[MutableList[str]]] = mapped_column(
        MutableList.as_mutable(JSON),
        nullable=True,
    )

    test = relationship("Test", back_populates="instances")
    grading_scheme = relationship("GradingScheme", back_populates="instances")
    results = relationship("Result", back_populates="test_instance", passive_deletes=True)
    activities = relationship("UserActivity", back_populates="test_instance", passive_deletes=True)


class Question(Base):
    __tablename__ = "Questions"

    question_id: Mapped[str] = mapped_column(String, primary_key=True)

    test_id: Mapped[str] = mapped_column(
        String, ForeignKey("Tests.test_id", ondelete="SET NULL"), nullable=True
    )
    course_page_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("CoursePages.page_id", ondelete="SET NULL"), nullable=True
    )

    question_text: Mapped[Optional[str]] = mapped_column(Text)
    question_type: Mapped[Optional[str]] = mapped_column(String)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSON)
    image_path: Mapped[Optional[str]] = mapped_column(String)
    points_value: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default='true')

    test = relationship("Test", back_populates="questions")
    course_page = relationship("CoursePage", back_populates="question", uselist=False)
    answers = relationship("Answer", back_populates="question")
    results = relationship("Result", back_populates="question", passive_deletes=True)


class Answer(Base):
    __tablename__ = "Answers"

    answer_id: Mapped[str] = mapped_column(String, primary_key=True)
    question_id: Mapped[str] = mapped_column(
        String, ForeignKey("Questions.question_id", ondelete="CASCADE"), index=True
    )
    answer_text: Mapped[Optional[str]] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    match_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    side: Mapped[Optional[str]] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default='true')

    question = relationship("Question", back_populates="answers")


class Result(Base):
    __tablename__ = "Results"

    result_id: Mapped[str] = mapped_column(String, primary_key=True)

    test_instance_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("TestInstances.instance_id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    test_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("Tests.test_id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    question_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("Questions.question_id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    user_activity_id: Mapped[Optional[str]] = mapped_column(
        String,
        ForeignKey("UserActivity.activity_id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    user_response: Mapped[Optional[Union[dict, list]]] = mapped_column(JSON, nullable=True)
    points_collected: Mapped[float] = mapped_column(Float, server_default="0.0", nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    test_instance = relationship("TestInstance", back_populates="results", passive_deletes=True)
    test = relationship("Test", back_populates="results", passive_deletes=True)
    question = relationship("Question", back_populates="results", passive_deletes=True)
    user_activity = relationship("UserActivity", back_populates="results", passive_deletes=True)


class UserActivity(Base):
    __tablename__ = "UserActivity"

    activity_id: Mapped[str] = mapped_column(String, primary_key=True)

    user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    instance_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("TestInstances.instance_id", ondelete="SET NULL"), nullable=True, index=True
    )

    user_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_surname: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    question_number: Mapped[int] = mapped_column(Integer, default=0)
    is_finished: Mapped[bool] = mapped_column(Boolean, default=False)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    score: Mapped[float] = mapped_column(Float, default=0.0)
    max_score: Mapped[float] = mapped_column(Float, default=0.0)
    questions_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    user = relationship(
        "User",
        back_populates="activities",
        primaryjoin="foreign(UserActivity.user_id) == User.user_id",
        viewonly=True
    )
    test_instance = relationship("TestInstance", back_populates="activities")
    results = relationship("Result", back_populates="user_activity", passive_deletes=True)


class GradingScheme(Base):
    __tablename__ = "Grading_schemes"

    scheme_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(String)
    scale_type: Mapped[Optional[str]] = mapped_column(String)

    partial_credit: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    penalize_wrong: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    penalty_per_wrong: Mapped[float] = mapped_column(Float, server_default="0.0", nullable=False)
    allow_negative_points: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )
    thresholds = relationship("GradingThreshold", back_populates="scheme", cascade="all")
    instances = relationship("TestInstance", back_populates="grading_scheme")


class GradingThreshold(Base):
    __tablename__ = "Grading_thresholds"

    threshold_id: Mapped[str] = mapped_column(String, primary_key=True)

    scheme_id: Mapped[str] = mapped_column(
        String, ForeignKey("Grading_schemes.scheme_id", ondelete="CASCADE"), nullable=False
    )

    percentage_min: Mapped[Optional[float]] = mapped_column(Float)
    percentage_max: Mapped[Optional[float]] = mapped_column(Float)
    grade: Mapped[Optional[int]] = mapped_column(Integer)

    scheme = relationship("GradingScheme", back_populates="thresholds")


class Course(Base):
    __tablename__ = "Courses"

    course_id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cover_image_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True
    )

    pages: Mapped[List["CoursePage"]] = relationship(
        "CoursePage",
        back_populates="course",
        order_by="CoursePage.order_index",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    progress: Mapped[List["CourseProgress"]] = relationship(
        "CourseProgress", back_populates="course", passive_deletes=True
    )


class CoursePage(Base):
    __tablename__ = "CoursePages"

    page_id: Mapped[str] = mapped_column(String, primary_key=True)
    course_id: Mapped[str] = mapped_column(
        String, ForeignKey("Courses.course_id", ondelete="CASCADE"), nullable=False
    )
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    page_type: Mapped[str] = mapped_column(String, nullable=False)

    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    course = relationship("Course", back_populates="pages")
    question = relationship("Question", back_populates="course_page", uselist=False)


class CourseProgress(Base):
    __tablename__ = "CourseProgress"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_course_progress_user_course"),)

    progress_id: Mapped[str] = mapped_column(String, primary_key=True)
    # No FK to Users: in open_mode, student user_id is a session-only ephemeral id
    # with no row in Users (same convention as UserActivity.user_id).
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(
        String, ForeignKey("Courses.course_id", ondelete="CASCADE"), nullable=False, index=True
    )

    current_page_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_page_ids: Mapped[Optional[MutableList[str]]] = mapped_column(
        MutableList.as_mutable(JSON),
        nullable=True,
        default=list,
    )
    page_answers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    is_completed: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        index=True
    )

    course = relationship("Course", back_populates="progress")
