# =========================================================================
# VERİTABANI BAĞLANTISI (DÜZELTİLDİ)
# =========================================================================

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "alpine_ai_db")

if not MONGO_URL:
    raise ValueError("MONGO_URL environment variable is not set")

# SRV bağlantıları için ekstra parametre gerekmez; timeout ekledik.
client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=8000,  # 8 sn
)

db = client.get_database(DB_NAME)

@app.on_event("startup")
async def verify_mongo_connection():
    """Uygulama açılırken Mongo'ya ping at; hata logla."""
    try:
        await client.admin.command("ping")
        logging.info("✅ MongoDB bağlantısı başarılı.")
    except Exception as e:
        logging.error(f"❌ MongoDB bağlantı HATASI: {e}")
        # Prod'da uygulamayı ayakta tutmak isteyebilirsin; burada raise etmiyoruz.

# =========================================================================
# GEREKLİ KÜTÜPHANE İÇE AKTARMALARI
# =========================================================================
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
import io

# Google GenAI kütüphanesini içe aktar
from google import genai
from google.genai.errors import APIError

# Statik Dosya Sunumu için gerekli
from fastapi.staticfiles import StaticFiles

# =========================================================================
# UYGULAMA VE YÖNLENDİRİCİ TANIMLAMA
# =========================================================================

# 1. ORTAM DEĞİŞKENLERİNİ YÜKLE
load_dotenv()

# FastAPI Uygulamasını Tanımla
app = FastAPI(title="Alpine AI Backend", version="1.0.0")

# 2. APIRouter'ı Tanımla (endpoint'lerden ÖNCE gelmelidir)
api_router = APIRouter(prefix="/api")

# =========================================================================
# GLOBAL DEĞİŞKENLER VE GÜVENLİK AYARLARI
# =========================================================================

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "alpine_ai_db")
SECRET_KEY = os.getenv("JWT_SECRET") 
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "168"))

# Gemini Model Ayarları
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash") 

# =========================================================================
# VERİTABANI BAĞLANTISI (KRİTİK HATA NOKTASI)
# =========================================================================

if not MONGO_URL:
    # Bu hata, Ortam Değişkeni olarak MONGO_URL tanımlanmadığında oluşur.
    raise ValueError("MONGO_URL environment variable is not set") 

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
# ... ve ping komutunu içeren try/except bloğu eklenmiş olmalıydı.
db = client.get_database(DB_NAME)

# =========================================================================
# VERİ MODELLERİ (User, Message, Conversation, vb.)
# =========================================================================

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    has_image: bool = False
    image_data: Optional[str] = None  # Base64 string
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = "New Chat Topic"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class ChatMessageRequest(BaseModel):
    conversation_id: str
    message: str

    @classmethod
    def as_form(cls, conversation_id: str = Form(...), message: str = Form(...)):
        return cls(conversation_id=conversation_id, message=message)

# =========================================================================
# GÜVENLİK VE BAĞIMLILIKLAR
# =========================================================================

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """JWT token'dan kullanıcıyı doğrular."""
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="Server config error: SECRET_KEY not set")
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        user_doc = await db.users.find_one({"id": user_id})
        if user_doc is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        return User(**user_doc)

    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# =========================================================================
# AUTH ENDPOINTS
# =========================================================================

@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    """Yeni kullanıcı kaydı."""
    # Email zaten kayıtlı mı kontrol et
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Şifreyi hash'le
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    # Yeni kullanıcı oluştur
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hashed_password.decode('utf-8')
    )
    
    user_dict = new_user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # JWT token oluştur
    access_token = jwt.encode(
        {"user_id": new_user.id, "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email
        }
    }

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    """Kullanıcı girişi."""
    # Kullanıcıyı bul
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**user_doc)
    
    # Şifreyi kontrol et
    if not bcrypt.checkpw(login_data.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # JWT token oluştur
    access_token = jwt.encode(
        {"user_id": user.id, "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email
        }
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Mevcut kullanıcı bilgilerini döner."""
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email
    }

# =========================================================================
# GEMINI CLIENT VE HELPER FONKSİYONLARI
# =========================================================================

# Global Gemini Client
try:
    if GEMINI_API_KEY:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        logging.info("Gemini client başarıyla başlatıldı.")
    else:
        logging.error("Gemini istemcisi başlatılamadı: GEMINI_API_KEY ortam değişkeni tanımlı değil.")
        gemini_client = None
except Exception as e:
    logging.error(f"Gemini istemcisi başlatılamadı: {e}")
    gemini_client = None

async def get_gemini_chat_history(conversation_id: str) -> List[Dict[str, Any]]:
    """Konuşma geçmişini Gemini formatında döner."""
    messages = await db.messages.find(
        {'conversation_id': conversation_id},
        {'_id': 0, 'role': 1, 'content': 1, 'image_data': 1, 'has_image': 1}
    ).sort('created_at', 1).to_list(1000)

    history = []
    for msg in messages:
        parts = [msg['content']]

        if msg.get('has_image') and msg.get('image_data'):
            try:
                image_bytes = base64.b64decode(msg['image_data'])
                # Düzeltme: MIME type'ı dinamik hale getir (şimdilik jpeg)
                parts.append(genai.types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'))
            except Exception as e:
                logging.warning(f"Failed to decode image data for history: {e}")

        gemini_role = 'user' if msg['role'] == 'user' else 'model'
        history.append({"role": gemini_role, "parts": parts})

    return history

async def generate_title_from_message(first_message: str) -> str:
    """İlk mesajdan başlık oluşturur."""
    if not gemini_client:
        return "New Chat Topic"

    system_instruction = "You are a title generator AI. Your sole purpose is to take the user's first message in a chat and generate a concise, descriptive, and human-readable title (max 5-7 words, NO punctuation marks like quotes or periods at the end). Respond ONLY with the title."

    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[f"Generate a title for this chat: '{first_message}'"],
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )

        title = response.text.strip().replace('"', '').replace("'", '').replace('.', '')

        if len(title.split()) > 7:
            return "New Chat Topic"

        return title

    except APIError as e:
        logging.error(f"Gemini API Error (Title generation): {e}")
        return "New Chat Topic"
    except Exception as e:
        logging.error(f"Title generation failed: {e}")
        return "New Chat Topic"

# =========================================================================
# CHAT ENDPOINTS
# =========================================================================

@api_router.post("/chat/conversation")
async def create_conversation(current_user: User = Depends(get_current_user)):
    """Yeni konuşma oluşturur."""
    new_conv = Conversation(user_id=current_user.id)
    conv_dict = new_conv.model_dump()
    conv_dict['created_at'] = conv_dict['created_at'].isoformat()
    conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()
    await db.conversations.insert_one(conv_dict)
    return new_conv

@api_router.get("/chat/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    """Kullanıcının konuşmalarını listeler."""
    conversations = await db.conversations.find(
        {'user_id': current_user.id},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    return conversations

@api_router.get("/chat/conversation/{conversation_id}/messages")
async def get_messages(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Belirli bir konuşmanın mesajlarını döner."""
    conversation = await db.conversations.find_one({'id': conversation_id, 'user_id': current_user.id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await db.messages.find(
        {'conversation_id': conversation_id},
        {'_id': 0}
    ).sort('created_at', 1).to_list(1000)
    return messages

@api_router.post("/chat/message")
async def send_message(
    chat_req: ChatMessageRequest = Depends(ChatMessageRequest.as_form),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    """Mesaj gönderir ve AI'dan yanıt alır."""
    if not gemini_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini hizmeti kullanıma hazır değil."
        )

    # 1. Konuşmayı doğrula
    conversation = await db.conversations.find_one({
        'id': chat_req.conversation_id,
        'user_id': current_user.id
    })
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # 2. Önceki mesajları al
    history = await get_gemini_chat_history(chat_req.conversation_id)

    # 3. Gemini Chat oturumunu başlat
    system_instruction = "You are Alpine, a helpful and friendly AI assistant created to help users with any questions or tasks. Be conversational, informative, and helpful."

    chat_session = gemini_client.chats.create(
        model=GEMINI_MODEL,
        history=history,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_instruction
        )
    )

    user_message_content = chat_req.message
    gemini_parts: List[Any] = [user_message_content]

    # 4. Dosya işleme
    image_data_to_save = None
    has_image_to_save = False

    if file and file.filename:
        file_bytes = await file.read()

        if file.content_type and file.content_type.startswith('image/'):
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            image_data_to_save = image_base64
            has_image_to_save = True
            gemini_parts.append(genai.types.Part.from_bytes(data=file_bytes, mime_type=file.content_type))
        else:
            user_message_content += f"\n\n(Dosya adı: {file.filename}, Tür: {file.content_type} eklendi.)"

    # 5. Kullanıcı mesajını kaydet
    user_message = Message(
        conversation_id=chat_req.conversation_id,
        role='user',
        content=user_message_content,
        has_image=has_image_to_save,
        image_data=image_data_to_save
    )
    user_msg_dict = user_message.model_dump()
    user_msg_dict['created_at'] = user_msg_dict['created_at'].isoformat()
    await db.messages.insert_one(user_msg_dict)

    # 6. İlk mesaj kontrolü
    is_first_message = len(history) == 0

    # 7. Gemini'dan yanıt al
    try:
        llm_response = await chat_session.send_message(contents=gemini_parts)
        assistant_message_content = llm_response.text
    except APIError as e:
        logging.error(f"Gemini API Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI'dan yanıt alınamadı. Lütfen API anahtarınızı kontrol edin."
        )
    except Exception as e:
        logging.error(f"Unexpected error during chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Beklenmedik bir hata oluştu."
        )

    # 8. Asistan mesajını kaydet
    assistant_message = Message(
        conversation_id=chat_req.conversation_id,
        role='assistant',
        content=assistant_message_content
    )
    assistant_msg_dict = assistant_message.model_dump()
    assistant_msg_dict['created_at'] = assistant_msg_dict['created_at'].isoformat()
    await db.messages.insert_one(assistant_msg_dict)

    # 9. Başlık ve güncellenme zamanını ayarla
    if is_first_message:
        title = await generate_title_from_message(chat_req.message)
        await db.conversations.update_one(
            {'id': chat_req.conversation_id},
            {'$set': {'title': title, 'updated_at': datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.conversations.update_one(
            {'id': chat_req.conversation_id},
            {'$set': {'updated_at': datetime.now(timezone.utc).isoformat()}}
        )

    return {
        'user_message': user_message,
        'assistant_message': assistant_message
    }

# =========================================================================
# GENEL YAPILANDIRMA
# =========================================================================
# ... (Diğer tüm kodlar burada bitiyor, en son delete_conversation endpoint'i ile)

@api_router.delete("/chat/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    """Konuşmayı ve mesajlarını siler."""
    conv_result = await db.conversations.delete_one({'id': conversation_id, 'user_id': current_user.id})
    if conv_result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or not authorized"
        )

    await db.messages.delete_many({'conversation_id': conversation_id})
    return {"message": "Conversation and messages deleted successfully"}


# =========================================================================
# GENEL YAPILANDIRMA VE STATİK DOSYALAR (DÜZELTİLMİŞ BLOK)
# =========================================================================

# Router'ı ekle
app.include_router(api_router)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    """MongoDB bağlantısını kapatır."""
    client.close()
    logging.info("MongoDB connection closed.")

# -------------------------------------------------------------------------
# KRİTİK STATİK DOSYA SUNUMU
# -------------------------------------------------------------------------

# Proje kök dizinini Statik Dosya sunumu için kullan.
STATIC_DIR = "." 
# '/' path'ine gelen tüm istekleri STATIC_DIR'daki index.html'ye yönlendirir.
# Bu, API rotaları hariç tüm isteklerin frontend'e gitmesini sağlar.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/health")
async def health_check():
    """Render için Health check endpoint'i."""
    # Bu, / mount'undan etkilenmez ve Render'ın durumu kontrol etmesini sağlar.
    return {"status": "healthy"}

