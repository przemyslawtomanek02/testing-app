import json
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..users.user_utils import get_formatted_results
from ... import schemas
from ...database.database import get_session
from ...utils.dependencies import is_admin
from sqlalchemy import select, func, or_, String, cast, case, Float
from ...database.dbmodels import (
    UserActivity as UA,
    TestInstance as TI,
    Result as R,
    Question as Q,
    Answer as A,
    Test as T, UserActivity,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin - Search"]
)


@router.get("/instances_search_all", response_model=List[schemas.InstanceAdminDetail])
async def instances_search_all(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera wszystkie instancje testów, posortowane od najnowszej."""

    agg = instance_aggregates()
    stmt = (
        select(
            TI.instance_id,
            TI.instance_name,
            TI.is_active,
            TI.created_at,
            agg.c.last_activity_at,
            agg.c.participants_count,
            agg.c.avg_score,
            agg.c.max_score,
            agg.c.completed_ratio,
        )
        .join(agg, agg.c.instance_id == TI.instance_id, isouter=True)
        .order_by(TI.created_at.desc())
    )
    rows = (await db.execute(stmt)).mappings().all()
    return rows


@router.get("/instances_search", response_model=List[schemas.InstanceAdminDetail])
async def search_instances(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_session),
    is_user_admin: bool = Depends(is_admin)
):
    agg = instance_aggregates()
    stmt = (
        select(
            TI.instance_id,
            TI.instance_name,
            TI.is_active,
            TI.created_at,
            T.name.label("test_name"),
            agg.c.last_activity_at,
            agg.c.participants_count,
            agg.c.avg_score,
            agg.c.max_score,
            agg.c.completed_ratio.label("completion_ratio"),
        )
        .join(T, T.test_id == TI.test_id, isouter=True)
        .join(agg, agg.c.instance_id == TI.instance_id, isouter=True)
        .order_by(TI.created_at.desc())
    )
    if search:
        stmt = stmt.where(TI.instance_name.ilike(f"%{search}%"))
    rows = (await db.execute(stmt)).mappings().all()
    return rows


@router.get("/users_search_all", response_model=List[schemas.UniqueUserResult])
async def search_all_users(
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera listę unikalnych użytkowników na podstawie ich ostatniej aktywności."""

    latest_subq = (
        select(
            UA.user_id.label("user_id"),
            func.max(UA.timestamp).label("max_ts"),
        )
        .group_by(UA.user_id)
        .subquery()
    )

    stmt = (
        select(
            UA.activity_id,
            UA.user_id,
            UA.user_name,
            UA.user_surname,
            UA.user_index,
            UA.timestamp.label("last_activity_at"),
        )
        .join(
            latest_subq,
            (UA.user_id == latest_subq.c.user_id) & (UA.timestamp == latest_subq.c.max_ts),
        )
        .order_by(UA.timestamp.desc())
    )
    res = await db.execute(stmt)
    return res.mappings().all()


@router.get("/users_search", response_model=List[schemas.UserActivitySearchResult])
async def search_users(
        search: Optional[str] = None,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin),
):
    """
    Wyszukuje aktywności użytkowników (podejścia do testów) po imieniu, nazwisku lub indeksie.
    Zwraca także `instance_name`.
    """
    stmt = (
        select(
            UA.activity_id,
            UA.user_id,
            UA.user_name,
            UA.user_surname,
            UA.user_index,
            UA.instance_id,
            UA.is_finished,
            UA.score,
            UA.max_score,
            UA.timestamp.label("last_activity_at"),
            TI.instance_name.label("instance_name"),
        )
        .join(TI, TI.instance_id == UA.instance_id, isouter=True)
        .order_by(UA.timestamp.desc())
    )

    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                UA.user_name.ilike(term),
                UA.user_surname.ilike(term),
                cast(UA.user_index, String).like(term),
            )
        )

    res = await db.execute(stmt)
    return res.mappings().all()


@router.get("/user_history/{user_id}", response_model=List[schemas.UserHistoryInstance])
async def get_user_history(
        user_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera wszystkie aktywności (podejścia do testów) dla danego user_id."""
    stmt = (
        select(
            UA.activity_id,
            UA.user_id,
            UA.instance_id,
            TI.instance_name.label("instance_name"),
            UA.score,
            UA.max_score,
            UA.is_finished,
            UA.timestamp,
        )
        .join(TI, TI.instance_id == UA.instance_id, isouter=True)
        .where(UA.user_id == user_id)
        .order_by(UA.timestamp.desc())
    )

    res = await db.execute(stmt)
    return res.mappings().all()


@router.get("/instances_search/detailInstanceInfo/{instance_id}",
            response_model=List[schemas.InstanceParticipantResult])
async def detail_instance_info(
        instance_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera listę wszystkich uczestników dla danej instancji testu."""

    stmt = (
        select(
            UA.activity_id,
            UA.user_id,
            UA.user_name,
            UA.user_surname,
            UA.user_index,
            UA.score,
            UA.max_score,
        )
        .where(UA.instance_id == instance_id)
        .order_by(UA.timestamp.desc())
    )

    res = await db.execute(stmt)
    return res.mappings().all()

@router.get("/users_search/detailUserInfo/{activity_id}", response_model=schemas.UserActivityResultDetail)
async def detail_user_info(
        activity_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """
    Pobiera szczegółowe wyniki dla pojedynczej aktywności użytkownika,
    poprawnie filtrując odpowiedzi na podstawie zapisanego "szkieletu" testu.
    """

    stmt = (
        select(UserActivity)
        .options(selectinload(UserActivity.test_instance))
        .where(UserActivity.activity_id == activity_id)
    )
    user_activity = (await db.execute(stmt)).scalar_one_or_none()

    if not user_activity:
        raise HTTPException(status_code=404, detail=f"No data found for activity_id {activity_id}")

    formatted_questions = await get_formatted_results(db, activity_id)

    skeleton = user_activity.questions_data or {}
    if isinstance(skeleton, str):
        try:
            skeleton = json.loads(skeleton)
        except json.JSONDecodeError:
            skeleton = {}

    if isinstance(skeleton, dict):
        question_order = skeleton.get("question_order", [])
        if question_order:
            formatted_map = {q.get("question_id"): q for q in formatted_questions if q.get("question_id")}
            ordered = [formatted_map[q_id] for q_id in question_order if q_id in formatted_map]
            ordered_ids = {q.get("question_id") for q in ordered}
            remaining = [q for q in formatted_questions if q.get("question_id") not in ordered_ids]
            formatted_questions = ordered + remaining

    deduped_questions = []
    seen_question_ids = set()
    for question in formatted_questions:
        q_id = question.get("question_id")
        if not q_id or q_id in seen_question_ids:
            continue
        seen_question_ids.add(q_id)
        deduped_questions.append(question)

    payload = {
        "user_name": user_activity.user_name,
        "user_surname": user_activity.user_surname,
        "user_index": user_activity.user_index,
        "instance_name": user_activity.test_instance.instance_name if user_activity.test_instance else None,
        "user_score": user_activity.score,
        "max_score_for_activity": user_activity.max_score,
        "questions": deduped_questions
    }

    return payload

@router.get("/instance_question_stats/{instance_id}")
async def get_instance_question_stats(
        instance_id: str,
        db: AsyncSession = Depends(get_session),
        is_user_admin: bool = Depends(is_admin)
):
    """Pobiera statystyki per pytanie dla instancji testu."""
    stmt = (
        select(
            R.result_id,
            R.question_id,
            R.user_response,
            R.points_collected,
            Q.question_text,
            Q.question_type,
            Q.points_value,
        )
        .join(UA, R.user_activity_id == UA.activity_id)
        .join(Q, R.question_id == Q.question_id)
        .where(UA.instance_id == instance_id)
    )
    rows = (await db.execute(stmt)).mappings().all()

    if not rows:
        return []

    question_ids = list({row["question_id"] for row in rows})

    ans_stmt = (
        select(A.answer_id, A.question_id, A.answer_text, A.is_correct)
        .where(A.question_id.in_(question_ids), A.is_active == True)
    )
    answers_by_question: Dict[str, list] = {}
    for a in (await db.execute(ans_stmt)).mappings().all():
        answers_by_question.setdefault(a["question_id"], []).append(a)

    questions_map: Dict[str, Any] = {}
    for row in rows:
        q_id = row["question_id"]
        if q_id not in questions_map:
            questions_map[q_id] = {
                "question_text": row["question_text"],
                "question_type": row["question_type"],
                "points_value": float(row["points_value"] or 0),
                "total_responses": 0,
                "correct_count": 0,
                "answer_pick_counts": {},
            }
        q_stats = questions_map[q_id]
        q_stats["total_responses"] += 1

        pts = float(row["points_collected"] or 0)
        max_pts = float(row["points_value"] or 0)
        if max_pts > 0 and pts >= max_pts:
            q_stats["correct_count"] += 1

        if row["question_type"] in ("SingleChoice", "MultipleChoice"):
            user_resp = row["user_response"]
            if isinstance(user_resp, list):
                for item in user_resp:
                    if isinstance(item, dict):
                        aid = item.get("answer_id")
                        if aid:
                            q_stats["answer_pick_counts"][aid] = q_stats["answer_pick_counts"].get(aid, 0) + 1

    result_list = []
    for q_id, q_stats in questions_map.items():
        total = q_stats["total_responses"]
        answers_info = []
        for a in answers_by_question.get(q_id, []):
            chosen = q_stats["answer_pick_counts"].get(a["answer_id"], 0)
            answers_info.append({
                "answer_id": a["answer_id"],
                "text": a["answer_text"],
                "is_correct": bool(a["is_correct"]),
                "chosen_count": chosen,
                "chosen_percent": round(chosen / total * 100, 1) if total > 0 else 0.0,
            })
        result_list.append({
            "question_id": q_id,
            "question_text": q_stats["question_text"],
            "question_type": q_stats["question_type"],
            "points_value": q_stats["points_value"],
            "total_responses": total,
            "correct_count": q_stats["correct_count"],
            "correct_percent": round(q_stats["correct_count"] / total * 100, 1) if total > 0 else 0.0,
            "answers": answers_info,
        })

    return result_list


def instance_aggregates():
    ua = UA
    return (
        select(
            ua.instance_id.label("instance_id"),
            func.max(ua.timestamp).label("last_activity_at"),
            func.count(func.distinct(ua.user_id)).label("participants_count"),
            func.avg(ua.score).label("avg_score"),
            func.max(ua.max_score).label("max_score"),
            func.avg(
                case((ua.is_finished.is_(True), 1), else_=0).cast(Float)
            ).label("completed_ratio"),
        )
        .group_by(ua.instance_id)
        .subquery()
    )
