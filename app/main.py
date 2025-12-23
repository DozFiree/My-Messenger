import datetime
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
import socket

load_dotenv()

app = FastAPI(
    title="DozFire's Messenger",
    description="Secure messenger with private and group chats",
    version="1.0.0"
)


# Получаем локальный IP адрес
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"


local_ip = get_local_ip()
print(f"📡 Локальный IP адрес: {local_ip}")

# Разрешаем все origins для разработки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Временно разрешаем всё
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Монтируем статические файлы
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
uploads_dir = os.path.join(current_dir, "uploads")

os.makedirs(static_dir, exist_ok=True)
os.makedirs(uploads_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Импортируем и настраиваем базу данных
from app.database import create_tables, engine, Base
from app.routers import router

Base.metadata.create_all(bind=engine)
app.include_router(router)



@app.get("/")
async def read_root():
    from fastapi.responses import FileResponse
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Index.html not found"}


@app.get("/test_connection.html")
async def test_connection():
    from fastapi.responses import FileResponse
    test_path = os.path.join(static_dir, "test_connection.html")
    if os.path.exists(test_path):
        return FileResponse(test_path)
    return {"message": "Test page not found"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "messenger-api",
        "local_ip": local_ip,
        "hostname": socket.gethostname()
    }


@app.get("/api/ping")
async def ping():
    return {
        "message": "pong",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 8000))

    print("=" * 50)
    print("🚀 DozFire's Messenger Server")
    print("=" * 50)
    print(f"📡 Сервер запущен на:")
    print(f"   🌐 http://localhost:{port}")
    print(f"   🌐 http://127.0.0.1:{port}")
    print(f"   🌐 http://{local_ip}:{port}")
    print("=" * 50)
    print("🔧 Для другого компьютера в сети используйте:")
    print(f"   💻 http://{local_ip}:{port}")
    print("=" * 50)
    print("⚙️  CORS настроен для всех источников")
    print("📁 Статические файлы:", static_dir)
    print("💾 База данных: messenger.db")
    print("=" * 50)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
        access_log=True
    )

# python -m app.main
# py -m app.main
# http://localhost:8000
## 192.168.5.107
#py -m venv .venv
#python -m venv .venv