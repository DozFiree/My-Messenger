from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, desc
from typing import List, Optional
from datetime import datetime
import os
import uuid

from app.database import get_db, User, Chat, ChatParticipant, Message, ChatType
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from pydantic import BaseModel, EmailStr
import shutil

router = APIRouter(prefix="/api", tags=["API"])


# Pydantic модели
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar_path: Optional[str] = None

    class Config:
        from_attributes = True


class CreatePrivateChatRequest(BaseModel):
    target_user_id: int


class CreateGroupChatRequest(BaseModel):
    name: str
    user_ids: List[int]


class SendMessageRequest(BaseModel):
    chat_id: int
    content: str


class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: str
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    is_read: bool
    created_at: datetime
    sender: UserResponse

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: int
    chat_type: ChatType
    chat_name: Optional[str] = None
    chat_avatar: Optional[str] = None
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    participants: List[UserResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Папка для загрузки файлов
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Регистрация
@router.post("/register", response_model=dict)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Проверка существующего пользователя
    existing_user = db.query(User).filter(
        or_(User.username == request.username, User.email == request.email)
    ).first()

    if existing_user:
        if existing_user.username == request.username:
            raise HTTPException(status_code=400, detail="Username already taken")
        else:
            raise HTTPException(status_code=400, detail="Email already registered")

    # Создание нового пользователя
    hashed_password = hash_password(request.password)
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"success": True, "user_id": user.id, "message": "Registration successful"}


# Логин
@router.post("/login", response_model=dict)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})

    return {
        "success": True,
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "avatar_path": user.avatar_path
        }
    }


# Поиск пользователей
@router.get("/users/search", response_model=List[UserResponse])
def search_users(
        q: str = Query(..., min_length=1),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    users = db.query(User).filter(
        User.username.ilike(f"%{q}%"),
        User.id != current_user.id,
        User.is_active == True
    ).limit(20).all()

    return users


# Создание личного чата
@router.post("/chats/private", response_model=dict)
def create_private_chat(
        request: CreatePrivateChatRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Проверка существования целевого пользователя
    target_user = db.query(User).filter(
        User.id == request.target_user_id,
        User.is_active == True
    ).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create chat with yourself")

    # Проверка существующего личного чата
    existing_chat = db.query(Chat).join(ChatParticipant).filter(
        Chat.chat_type == ChatType.PRIVATE,
        ChatParticipant.user_id.in_([current_user.id, target_user.id])
    ).group_by(Chat.id).having(db.func.count(ChatParticipant.user_id) == 2).first()

    if existing_chat:
        return {
            "success": True,
            "chat_id": existing_chat.id,
            "message": "Chat already exists",
            "is_new": False
        }

    # Создание нового чата
    chat = Chat(
        chat_type=ChatType.PRIVATE,
        creator_id=current_user.id
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)

    # Добавление участников
    participants = [
        ChatParticipant(chat_id=chat.id, user_id=current_user.id),
        ChatParticipant(chat_id=chat.id, user_id=target_user.id)
    ]

    db.add_all(participants)
    db.commit()

    return {
        "success": True,
        "chat_id": chat.id,
        "message": "Private chat created",
        "is_new": True
    }


# Создание группового чата
@router.post("/chats/group", response_model=dict)
def create_group_chat(
        request: CreateGroupChatRequest,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if not request.name:
        raise HTTPException(status_code=400, detail="Group name is required")

    if len(request.user_ids) == 0:
        raise HTTPException(status_code=400, detail="Add at least one user to the group")

    # Проверка существования пользователей
    users = db.query(User).filter(
        User.id.in_(request.user_ids),
        User.is_active == True
    ).all()

    if len(users) != len(request.user_ids):
        raise HTTPException(status_code=404, detail="Some users not found")

    # Создание группового чата
    chat = Chat(
        chat_type=ChatType.GROUP,
        chat_name=request.name,
        creator_id=current_user.id
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)

    # Добавление участников (создатель - админ)
    participants = [ChatParticipant(chat_id=chat.id, user_id=current_user.id, is_admin=True)]

    for user_id in request.user_ids:
        if user_id != current_user.id:
            participants.append(ChatParticipant(chat_id=chat.id, user_id=user_id))

    db.add_all(participants)
    db.commit()

    return {
        "success": True,
        "chat_id": chat.id,
        "message": "Group chat created"
    }


# Получение списка чатов пользователя
@router.get("/chats", response_model=List[ChatResponse])
def get_user_chats(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Получаем все чаты пользователя
    chats = db.query(Chat).join(ChatParticipant).filter(
        ChatParticipant.user_id == current_user.id,
        Chat.is_active == True
    ).options(
        joinedload(Chat.participants).joinedload(ChatParticipant.user),
        joinedload(Chat.messages)
    ).order_by(desc(Chat.updated_at)).all()

    result = []
    for chat in chats:
        # Получаем последнее сообщение
        last_message = None
        if chat.messages:
            last_message = sorted(chat.messages, key=lambda x: x.created_at, reverse=True)[0]

        # Считаем непрочитанные сообщения
        unread_count = db.query(Message).filter(
            Message.chat_id == chat.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()

        # Формируем список участников
        participants = [participant.user for participant in chat.participants]

        # Для личного чата определяем собеседника
        chat_name = chat.chat_name
        if chat.chat_type == ChatType.PRIVATE:
            other_participant = next((p for p in participants if p.id != current_user.id), None)
            if other_participant:
                chat_name = other_participant.username

        result.append(ChatResponse(
            id=chat.id,
            chat_type=chat.chat_type,
            chat_name=chat_name,
            chat_avatar=chat.chat_avatar,
            last_message=last_message,
            unread_count=unread_count,
            participants=participants,
            created_at=chat.created_at,
            updated_at=chat.updated_at
        ))

    return result


# Получение сообщений чата
@router.get("/chats/{chat_id}/messages", response_model=List[MessageResponse])
def get_chat_messages(
        chat_id: int,
        skip: int = Query(0, ge=0),
        limit: int = Query(50, ge=1, le=100),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Проверка участия в чате
    participation = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user.id
    ).first()

    if not participation:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")

    # Получение сообщений
    messages = db.query(Message).filter(
        Message.chat_id == chat_id
    ).options(
        joinedload(Message.sender)
    ).order_by(desc(Message.created_at)).offset(skip).limit(limit).all()

    # Помечаем сообщения как прочитанные
    unread_messages = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).all()

    for msg in unread_messages:
        msg.is_read = True

    db.commit()

    return list(reversed(messages))  # Возвращаем в хронологическом порядке


# Отправка сообщения
@router.post("/messages", response_model=MessageResponse)
async def send_message(
        chat_id: int = Form(...),
        content: str = Form(...),
        file: Optional[UploadFile] = File(None),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Проверка участия в чате
    participation = db.query(ChatParticipant).filter(
        ChatParticipant.chat_id == chat_id,
        ChatParticipant.user_id == current_user.id
    ).first()

    if not participation:
        raise HTTPException(status_code=403, detail="Not a participant of this chat")

    # Обработка файла
    file_path = None
    file_type = None

    if file:
        # Генерируем уникальное имя файла
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        file_type = file.content_type

        # Сохраняем файл
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    # Создание сообщения
    message = Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=content,
        file_path=file_path,
        file_type=file_type
    )

    db.add(message)

    # Обновляем время последнего обновления чата
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    chat.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    # Загружаем отправителя для ответа
    message.sender = current_user

    return message


# Загрузка аватара пользователя
@router.post("/users/avatar", response_model=dict)
async def upload_avatar(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Проверяем тип файла
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed")

    # Генерируем уникальное имя файла
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Обновляем путь к аватару в базе
    current_user.avatar_path = file_path
    db.commit()

    return {
        "success": True,
        "avatar_path": file_path,
        "message": "Avatar uploaded successfully"
    }


# Получение профиля пользователя
@router.get("/users/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


# Поиск пользователя по ID
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(
        user_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user