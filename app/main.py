from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles  # ← ИМПОРТИРУЕМ ЭТО!
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

from app.routers import router
from app.database import create_tables, engine, Base


# Создание таблиц при запуске
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DozFire's Messenger",
    description="Secure messenger with private and group chats",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ПОДКЛЮЧАЕМ СТАТИЧЕСКИЕ ФАЙЛЫ (HTML, CSS, JS)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Подключение API-роутеров
app.include_router(router)

# Главная страница - перенаправляем на index.html
@app.get("/")
def read_root():
    from fastapi.responses import FileResponse
    return FileResponse("app/static/index.html")



@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "messenger-api"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)