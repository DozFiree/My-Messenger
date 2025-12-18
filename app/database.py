from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Boolean, Text, UniqueConstraint, \
    Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv
import enum

load_dotenv()

# Подключение к БД
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./messenger.db")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Enum для типов чата
class ChatType(str, enum.Enum):
    PRIVATE = "private"
    GROUP = "group"


# Модель Пользователя
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_path = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Отношения
    sent_messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    chat_participations = relationship("ChatParticipant", back_populates="user")
    owned_chats = relationship("Chat", back_populates="creator", foreign_keys="Chat.creator_id")


# Модель Чата (личный или групповой)
class Chat(Base):
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, index=True)
    chat_type = Column(Enum(ChatType), nullable=False, default=ChatType.PRIVATE)
    chat_name = Column(String(100), nullable=True)  # Для групп
    chat_avatar = Column(String(255), nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Уникальное ограничение для личных чатов (два пользователя)
    __table_args__ = (
        UniqueConstraint('chat_type', 'creator_id', name='unique_private_chat'),
    )

    # Отношения
    creator = relationship("User", back_populates="owned_chats", foreign_keys=[creator_id])
    participants = relationship("ChatParticipant", back_populates="chat", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


# Модель Участника чата
class ChatParticipant(Base):
    __tablename__ = "chat_participants"
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_admin = Column(Boolean, default=False)  # Для групповых чатов

    # Уникальное ограничение - пользователь не может быть дважды в одном чате
    __table_args__ = (
        UniqueConstraint('chat_id', 'user_id', name='unique_chat_participant'),
    )

    # Отношения
    chat = relationship("Chat", back_populates="participants")
    user = relationship("User", back_populates="chat_participations")


# Модель Сообщения
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    file_path = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Отношения
    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])


def get_db():
    """
    Зависимость для получения сессии базы данных
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Создание всех таблиц в базе данных"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Удаление всех таблиц (для тестирования)"""
    Base.metadata.drop_all(bind=engine)