# app/main.py
import logging
import os
from contextlib import asynccontextmanager
import time
import uvicorn
from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.staticfiles import StaticFiles
from rich.logging import RichHandler
from starlette.exceptions import HTTPException
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import JSONResponse

from fastapi_app.database.database import dispose_engine, init_models
from fastapi_app.routes.admin import admin_utils, admin_auth, grading, instance_management, search, \
    test_management, users_managment, generated_results, course_management
from fastapi_app.routes.users import user_auth, users, profile, courses
from fastapi_app.routes import default
from fastapi_app.utils.dependencies import is_admin
from fastapi_app.utils.helpers import generate_id
from fastapi_app.config import settings
from fastapi_app.utils.scheduler import scheduler, close_expired_tests

os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
os.makedirs(settings.STATIC_FOLDER, exist_ok=True)
os.makedirs(settings.FRONTEND_FOLDER, exist_ok=True)
os.makedirs(settings.AVATARS_FOLDER, exist_ok=True)

logging.basicConfig(
    level="INFO",
    format="%(asctime)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        RichHandler(
            rich_tracebacks=True,
            show_path=True,
            tracebacks_show_locals=True,
            tracebacks_width=200,
            markup=True,
            show_time=False
        )
    ]
)
logger = logging.getLogger()


# --- Menedżer Kontekstu Lifespan ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Aplikacja FastAPI startuje...")

    await init_models()

    scheduler.add_job(close_expired_tests, 'interval', minutes=2, id='close_tests_job')
    scheduler.start()

    yield

    scheduler.shutdown()
    await dispose_engine()
    logging.info("Aplikacja FastAPI została zamknięta.")


# --- Inicjalizacja Aplikacji FastAPI ---
app = FastAPI(
    title="TesterSerwer API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=settings.CORS_SUPPORTS_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def unified_logging_middleware(request: Request, call_next):
    if 'user_id' not in request.session:
        request.session['user_id'] = generate_id()

    start_time = time.perf_counter()
    response: Response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000

    path = request.url.path
    if path.endswith(('.js', '.html', '.css')):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    elif path.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webm', '.webp')):
        response.headers['Cache-control'] = 'public, max-age=2592000'

    response.headers["X-Process-Time-ms"] = f"{process_time:.2f}"

    client_host = request.client.host
    status_code = response.status_code

    log_message = f"{client_host} - {status_code} - {request.method} {path} | Time: {process_time:.2f}ms"

    if status_code < 400:
        logger.info(log_message)
    elif 400 <= status_code < 500:
        logger.warning(log_message)
    else:
        logger.error(log_message)

    return response


app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# --- Rejestracja Routerów ---
app.include_router(admin_utils.router)
app.include_router(admin_auth.router)
app.include_router(users_managment.router)
app.include_router(grading.router)
app.include_router(instance_management.router)
app.include_router(search.router)
app.include_router(test_management.router)
app.include_router(course_management.router)
app.include_router(user_auth.router)
app.include_router(profile.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(generated_results.router)
app.include_router(default.router)


# --- Serwowanie Plików Statycznych ---

app.mount("/assets", StaticFiles(directory=settings.STATIC_FOLDER), name="static")
app.mount("/media", StaticFiles(directory=settings.MEDIA_FOLDER), name="media")
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_FOLDER), name="uploads")
app.mount("/avatars", StaticFiles(directory=settings.AVATARS_FOLDER), name="avatars")


@app.get("/error_test")
async def trigger_error():
    """Ten endpoint celowo powoduje błąd, aby przetestować traceback."""
    print("Celowe wywoływanie błędu...")
    result = 1 / 0
    return {"message": "Ten komunikat nigdy się nie pojawi"}


@app.get("/docs", include_in_schema=False)
async def get_protected_docs(is_user_admin: bool = Depends(is_admin)):
    """Chroniony endpoint serwujący dokumentację Swagger UI."""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI"
    )


@app.get("/redoc", include_in_schema=False)
async def get_protected_redoc(is_user_admin: bool = Depends(is_admin)):
    """Chroniony endpoint serwujący dokumentację ReDoc."""
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc"
    )


@app.get("/robots.txt")
async def serve_robots_txt():
    from fastapi.responses import FileResponse
    robots_path = os.path.join(settings.FRONTEND_FOLDER, "robots.txt")
    return FileResponse(robots_path, media_type="text/plain")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    from fastapi.responses import FileResponse
    index_path = os.path.join(settings.FRONTEND_FOLDER, "index.html")
    return FileResponse(index_path)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Przechwytuje błędy HTTPException, loguje je do konsoli
    i zwraca standardową odpowiedź JSON do klienta.
    """
    logger.warning(
        f'Zwrócono błąd HTTP: {exc.status_code} | Ścieżka: {request.url.path} | Detail: "{exc.detail}"'
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

# --- Uruchomienie Serwera ---

if __name__ == "__main__":
    logger.info(f"Uruchamianie serwera na 0.0.0.0:{settings.PORT} w trybie '{settings.APP_ENV}'...")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.APP_ENV == "development",
        use_colors=True,
        access_log=False,
        log_config=None,
    )
