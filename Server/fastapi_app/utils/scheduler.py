# app/utils/scheduler.py
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database.dbmodels import UserActivity
from ..routes.users.user_utils import fill_missing_results
from ..database.database import session_context

scheduler = AsyncIOScheduler(timezone="UTC")


async def close_expired_tests():
    """
    Asynchroniczna funkcja, która znajduje i zamyka przeterminowane instancje testów.
    """
    logging.info("Scheduler: Checking for expired test sessions...")

    try:
        async with session_context() as db:
            result = await db.execute(
                select(UserActivity)
                .options(selectinload(UserActivity.test_instance))
                .where(UserActivity.is_finished == False)
            )

            active_tests = result.scalars().all()
            now = datetime.now(timezone.utc)
            expired_sessions = []

            for active_session in active_tests:
                start_time = active_session.timestamp
                if start_time.tzinfo is None:
                    start_time = start_time.replace(tzinfo=timezone.utc)
                duration = active_session.test_instance.test_time
                end_time = start_time + timedelta(minutes=duration)

                if now > end_time:
                    expired_sessions.append(active_session)

            if not expired_sessions:
                logging.info("Scheduler: No overdue test sessions...")
                return

            logging.info(f"Scheduler: Found {len(expired_sessions)} expired test sessions. Closing...")

            for activity in expired_sessions:
                await fill_missing_results(db, activity.activity_id)
                activity.is_finished = True

            await db.commit()

    except Exception as e:
        logging.error(f"Scheduler: Error while closing expired test sessions: {e}")
