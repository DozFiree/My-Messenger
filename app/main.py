from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

from app.routers import router
from app.database import create_tables, engine, Base

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DozFire's Messenger",
    description="Secure messenger with private and group chats",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.mount("/uploads", StaticFiles(directory="app/uploads"), name="uploads")

app.include_router(router)


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

# python -m app.main
# py -m app.main
# http://localhost:8000
## 192.168.5.107
#py -m venv .venv
#python -m venv .venv