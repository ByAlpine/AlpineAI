# =========================================================================
# GEREKLİ KÜTÜPHANE İÇE AKTARMALARI
# =========================================================================
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# YENİ: Google GenAI kütüphanesini içe aktar
from google import genai
from google.genai.errors import APIError

# Statik Dosya Sunumu için gerekli
from fastapi.staticfiles import StaticFiles


# =========================================================================
# UYGULAMA VE YÖNLENDİRİCİ TANIMLAMA (KRİTİK DÜZELTMELER BURADA)
# =========================================================================

# 1. ORTAM DEĞİŞKENLERİNİ YÜKLE
load_dotenv()

# FastAPI Uygulamasını Tanımla
app = FastAPI(title="Alpine AI Backend", version="1.0.0")

# 2. APIRouter'ı Tanımla (HATA DÜZELTİLDİ: endpoint'lerden ÖNCE gelmelidir)
api_router = APIRouter(prefix="/api")

# =========================================================================
# GLOBAL DEĞİŞKENLER VE GÜVENLİK AYARLARI
# =========================================================================

MONGO_URL = os.getenv("MONGO_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 hafta

# Gemini Model Ayarları
# HATA DÜZELTİLDİ: Ortam değişkenlerine os.getenv() ile erişilir
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# =========================================================================
# VERİ MODELLERİ (EKSİK KISIMLAR TEMSİL EDİLİYOR)
# =========================================================================

class User(BaseModel):
    # Tahmini User modeli
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class Message(BaseModel):
    # Tahmini Message modeli
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    has_image: bool = False
    image_data: Optional[str] = None # Base64 string
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class Conversation(BaseModel):
    # Tahmini Conversation modeli
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = "New Chat Topic"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# İsteğe bağlı (form verisi alımı için)
class ChatMessageRequest(BaseModel):
    conversation_id: str
    message: str

    @classmethod
    def as_form(cls, conversation_id: str = Form(...), message: str = Form(...)):
        return cls(conversation_id=conversation_id, message=message)

# =========================================================================
# GÜVENLİK VE BAĞIMLILIKLAR (EKSİK KISIMLAR TEMSİL EDİLİYOR)
# =========================================================================

security = HTTPBearer()

# DB Bağlantısı
client = AsyncIOMotorClient(MONGO_URL)
db = client.get_database("ai_chat_db")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    # JWT çözümleme ve kullanıcı doğrulama mantığı buraya gelir
    # ... (JWT çözümleme kodu) ...
    # ... (DB'den kullanıcıyı çekme kodu) ...
    
    # Hata Durumunda
    # raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    # Başarılı Durumda (Örnek dönüş)
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
        
        # MongoDB'den alınan belgeyi Pydantic modeline dönüştür
        return User(**user_doc) 
        
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# =========================================================================
# AUTH ENDPOINTS (EKSİK KISIMLAR TEMSİL EDİLİYOR)
# =========================================================================

# @api_router.post("/auth/register")
# async def register_user(...):
#     # Kayıt mantığı buraya gelir...
#     pass

# @api_router.post("/auth/login")
# async def login_user(...):
#     # Giriş mantığı buraya gelir...
#     pass

# @api_router.get("/auth/me")
# async def get_current_user_info(...):
#     # Kullanıcı bilgi alma mantığı buraya gelir...
#     pass


# =========================================================================
# YENİ: Gemini Client ve Helper Fonksiyonları
# =========================================================================

# Global Gemini Client
try:
    # HATA DÜZELTİLDİ: os.getenv() kullanılarak API anahtarı doğru yüklenir
    if GEMINI_API_KEY:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    else:
        # Hata durumunda loglama
        logging.error("Gemini istemcisi başlatılamadı: GEMINI_API_KEY ortam değişkeni tanımlı değil.")
        gemini_client = None
except Exception as e:
    logging.error(f"Gemini istemcisi başlatılamadı: {e}")
    gemini_client = None


async def get_gemini_chat_history(conversation_id: str) -> List[Dict[str, Any]]:
    # ... (Fonksiyon içeriği aynı kalır) ...
    messages = await db.messages.find(
        {'conversation_id': conversation_id},
        {'_id': 0, 'role': 1, 'content': 1, 'image_data': 1, 'has_image': 1}
    ).sort('created_at', 1).to_list(1000)

    history = []
    for msg in messages:
        parts = [msg['content']]
        
        if msg.get('has_image') and msg.get('image_data'):
            try:
                # Base64 string'i byte'a çevir (çoklu parça göndermek için)
                image_bytes = base64.b64decode(msg['image_data'])
                # Sadece görsel içeriği, Gemini'da metin bağlamından ayırmak için
                parts.append(genai.types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg')) 
            except Exception as e:
                logging.warning(f"Failed to decode image data for history: {e}")
                
        gemini_role = 'user' if msg['role'] == 'user' else 'model'
        
        # History'ye eklerken sadece metin veya dosya içeriğini kullan
        history.append({"role": gemini_role, "parts": parts}) 
        
    return history


async def generate_title_from_message(first_message: str) -> str:
    # ... (Fonksiyon içeriği aynı kalır) ...
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
# CHAT ENDPOINTS (EKSİK KISIMLAR TEMSİL EDİLİYOR)
# =========================================================================

@api_router.post("/chat/conversation")
async def create_conversation(current_user: User = Depends(get_current_user)):
    # Yeni konuşma oluşturma mantığı buraya gelir...
    new_conv = Conversation(user_id=current_user.id)
    conv_dict = new_conv.model_dump()
    conv_dict['created_at'] = conv_dict['created_at'].isoformat()
    conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()
    await db.conversations.insert_one(conv_dict)
    return new_conv

@api_router.get("/chat/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    # Konuşmaları listeleme mantığı buraya gelir...
    conversations = await db.conversations.find({'user_id': current_user.id}).sort('updated_at', -1).to_list(100)
    return conversations

@api_router.get("/chat/conversation/{conversation_id}/messages")
async def get_messages(conversation_id: str, current_user: User = Depends(get_current_user)):
    # Mesajları alma mantığı buraya gelir...
    conversation = await db.conversations.find_one({'id': conversation_id, 'user_id': current_user.id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = await db.messages.find({'conversation_id': conversation_id}).sort('created_at', 1).to_list(1000)
    return messages


@api_router.post("/chat/message")
async def send_message(
    chat_req: ChatMessageRequest = Depends(ChatMessageRequest.as_form), 
    file: Optional[UploadFile] = File(None), 
    current_user: User = Depends(get_current_user),
):
    """Handles sending a message (text and optional file) to the AI."""
    if not gemini_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Gemini hizmeti kullanıma hazır değil.")

    # 1. Konuşmanın kullanıcıya ait olduğunu doğrula
    conversation = await db.conversations.find_one({
        'id': chat_req.conversation_id,
        'user_id': current_user.id
    })
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        
    # 2. Önceki mesajları al
    history = await get_gemini_chat_history(chat_req.conversation_id)
    
    # 3. Gemini Chat oturumunu (geçmişi ile) başlat
    system_instruction = "You are Alpine, a helpful and friendly AI assistant created to help users with any questions or tasks. Be conversational, informative, and helpful."
    
    chat_session = gemini_client.chats.create(
        model=GEMINI_MODEL,
        history=history, # Önceki mesajları geçmiş olarak ekle
        config=genai.types.GenerateContentConfig(
            system_instruction=system_instruction
        )
    )

    user_message_content = chat_req.message
    gemini_parts: List[Any] = [user_message_content]
    
    # 4. Dosya işleme mantığı (user_message'e ve Gemini'a eklenecek)
    image_data_to_save = None
    has_image_to_save = False

    if file and file.filename:
        file_bytes = await file.read()
        
        if file.content_type.startswith('image/'):
            # Base64 olarak kaydet
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            image_data_to_save = image_base64
            has_image_to_save = True
            
            # Yüklenen görseli Gemini'a gönderilecek parçalara ekle
            gemini_parts.append(genai.types.Part.from_bytes(data=file_bytes, mime_type=file.content_type))
            
        else:
            # Diğer dosya türleri: Dosya içeriği metin olarak Gemini'a gönderilir.
            # Gerçek uygulamada dosya yükleme (client.files.upload) gerekir, burası basitleştirilmiş bir örnektir.
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
    
    # 6. İlk mesaj kontrolü (Başlık güncellemesi için)
    is_first_message = len(history) == 0

    # 7. Gemini API'den yanıt al
    try:
        # Chat Session'a sadece yeni mesajın içeriğini gönder
        llm_response = await chat_session.send_message(
            contents=gemini_parts
        )
        assistant_message_content = llm_response.text
    except APIError as e:
        logging.error(f"Gemini API Error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI'dan yanıt alınamadı. Lütfen API anahtarınızı kontrol edin.")
    except Exception as e:
        logging.error(f"Unexpected error during chat: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Beklenmedik bir hata oluştu.")

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
    
@api_router.delete("/chat/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    # Konuşmayı silme mantığı buraya gelir...
    # Konuşmayı bul ve kullanıcıya ait olduğunu doğrula
    conv_result = await db.conversations.delete_one({'id': conversation_id, 'user_id': current_user.id})
    if conv_result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found or not authorized")
        
    # İlgili mesajları da sil
    await db.messages.delete_many({'conversation_id': conversation_id})
    
    return {"message": "Conversation and messages deleted successfully"}


# =========================================================================
# GENEL YAPILANDIRMA VE STATİK DOSYALAR
# =========================================================================

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    """MongoDB bağlantısını kapatır."""
    client.close()

# --- Statik Dosya Sunumu (Frontend Entegrasyonu) ---

# Proje kök dizinini Statik Dosya sunumu için kullan
STATIC_DIR = "." 
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

@app.get("/")
async def root_path():
    """Kök yola gelen istekleri STATIC_DIR'daki index.html'e yönlendirir."""
    # Render'da frontend ve backend aynı yerde çalışıyorsa
    return RedirectResponse(url="/index.html")

@app.get("/api")
async def api_root():
    """API'nin çalıştığını kontrol etmek için kök rota."""
    return {"detail": "API is Running."}
