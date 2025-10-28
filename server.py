from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType, ImageContent
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Environment variables
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))

security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    has_image: bool = False
    image_data: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageRequest(BaseModel):
    # Form data'yı işlemek için yeni model.
    conversation_id: str = Form(...)
    message: str = Form(...)

    @classmethod
    def as_form(
        cls,
        conversation_id: str = Form(...),
        message: str = Form(...),
    ):
        """FastAPI'nin UploadFile ile Pydantic modelini birleştirmesini sağlar."""
        return cls(
            conversation_id=conversation_id,
            message=message
        )

# Auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        'user_id': user_id,
        'exp': expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        user = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def generate_title_from_message(first_message: str) -> str:
    """Uses Gemini to generate a short, descriptive title for a conversation."""
    
    # Başlık üretmek için ayrı bir LlmChat örneği oluşturulur.
    title_generator = LlmChat(
        api_key=GEMINI_API_KEY,
        system_message="You are a title generator AI. Your sole purpose is to take the user's first message in a chat and generate a concise, descriptive, and human-readable title (max 5-7 words, NO punctuation marks like quotes or periods at the end). Respond ONLY with the title."
    ).with_model("gemini", GEMINI_MODEL)
    
    try:
        response = await title_generator.send_message(
            contents=[UserMessage(text=f"Generate a title for this chat: '{first_message}'")]
        )
        
        # Temizleme: AI'ın ekleyebileceği tırnak işaretlerini veya yeni satırları kaldır
        title = response.text.strip().replace('"', '').replace("'", '').replace('.', '')
        
        # Başlığın çok uzun olmaması için son bir kontrol
        if len(title.split()) > 7:
            return "New Chat Topic"
            
        return title
        
    except Exception as e:
        logging.error(f"Title generation failed: {e}")
        return "New Chat Topic"


# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(email=user_data.email, full_name=user_data.full_name)
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id)
    return {'token': token, 'user': user}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'])
    user_obj = User(**user)
    return {'token': token, 'user': user_obj}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Chat endpoints
@api_router.post("/chat/conversation")
async def create_conversation(current_user: User = Depends(get_current_user)):
    conversation = Conversation(
        user_id=current_user.id,
        title="New Chat"
    )
    conv_dict = conversation.model_dump()
    conv_dict['created_at'] = conv_dict['created_at'].isoformat()
    conv_dict['updated_at'] = conv_dict['updated_at'].isoformat()
    
    await db.conversations.insert_one(conv_dict)
    return conversation

@api_router.get("/chat/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    conversations = await db.conversations.find(
        {'user_id': current_user.id},
        {'_id': 0}
    ).sort('updated_at', -1).to_list(100)
    
    for conv in conversations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if isinstance(conv.get('updated_at'), str):
            conv['updated_at'] = datetime.fromisoformat(conv['updated_at'])
    
    return [Conversation(**c) for c in conversations]

@api_router.get("/chat/conversation/{conversation_id}/messages")
async def get_messages(conversation_id: str, current_user: User = Depends(get_current_user)):
    # Verify conversation belongs to user
    conversation = await db.conversations.find_one({'id': conversation_id, 'user_id': current_user.id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.messages.find(
        {'conversation_id': conversation_id},
        {'_id': 0}
    ).sort('created_at', 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    return [Message(**m) for m in messages]

@api_router.post("/chat/message")
async def send_message(
    chat_req: ChatMessageRequest = Depends(ChatMessageRequest.as_form), # Yeni Form modelini kullan
    file: Optional[UploadFile] = File(None), # Dosya yükleme desteği
    current_user: User = Depends(get_current_user),
):
    """Handles sending a message (text and optional file) to the AI."""
    
    # Konuşmanın kullanıcıya ait olduğunu doğrula
    conversation = await db.conversations.find_one({
        'id': chat_req.conversation_id,
        'user_id': current_user.id
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # Gemini Chat oturumunu başlat
    chat = LlmChat(
        api_key=GEMINI_API_KEY,
        session_id=chat_req.conversation_id,
        system_message="You are Alpine, a helpful and friendly AI assistant created to help users with any questions or tasks. Be conversational, informative, and helpful."
    ).with_model("gemini", GEMINI_MODEL)
    
    user_message_content = chat_req.message

    # Gemini'a gönderilecek içerikleri hazırla
    contents: List[UserMessage] = [UserMessage(text=user_message_content)]
    
    # Dosya işleme mantığı
    image_data_to_save = None
    has_file_to_save = False

    if file and file.filename:
        file_bytes = await file.read()
        has_file_to_save = True

        if file.content_type.startswith('image/'):
            # Görsel yükleme (Base64)
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            contents.append(
                UserMessage(
                    image_content=ImageContent(
                        image_base64=image_base64,
                        mime_type=file.content_type
                    )
                )
            )
            image_data_to_save = image_base64
            
        else:
            # Doküman/PDF/TXT yükleme (Doğrudan byte olarak)
            contents.append(
                UserMessage(
                    file_content=FileContentWithMimeType(
                        data=file_bytes,
                        mime_type=file.content_type
                    )
                )
            )
        
        # Kullanıcının mesajına dosya adını ekle (Arayüzde gösterim ve kaydetme için)
        user_message_content += f" [Yüklenen Dosya: {file.filename} ({file.content_type})]"

    # Kullanıcı mesajını kaydet
    user_message = Message(
        conversation_id=chat_req.conversation_id,
        role='user',
        content=user_message_content,
        has_image=has_file_to_save and file.content_type.startswith('image/'),
        image_data=image_data_to_save
    )
    user_msg_dict = user_message.model_dump()
    user_msg_dict['created_at'] = user_msg_dict['created_at'].isoformat()
    await db.messages.insert_one(user_msg_dict)
    
    # İlk mesaj kontrolü (Başlık güncellemesi için)
    # Yeni eklenen mesaj hariç, konuşmada başka mesaj var mı?
    history_check = await db.messages.find(
        {'conversation_id': chat_req.conversation_id, 'id': {'$ne': user_msg_dict['id']}},
        {'id': 1}
    ).to_list(1)
    is_first_message = len(history_check) == 0


    # Gemini API'den yanıt al
    try:
        llm_response = await chat.send_message(
            contents=contents
        )
        assistant_message_content = llm_response.text
    except Exception as e:
        logging.error(f"Gemini API Error: {e}")
        raise HTTPException(status_code=500, detail="AI'dan yanıt alınamadı. Lütfen API anahtarınızı ve yapılandırmanızı kontrol edin.")

    # Asistan mesajını kaydet
    assistant_message = Message(
        conversation_id=chat_req.conversation_id,
        role='assistant',
        content=assistant_message_content
    )
    assistant_msg_dict = assistant_message.model_dump()
    assistant_msg_dict['created_at'] = assistant_msg_dict['created_at'].isoformat()
    await db.messages.insert_one(assistant_msg_dict)
    
    # Başlık ve güncellenme zamanını ayarla
    if is_first_message:
        # Otomatik başlık üretme (Sadece orijinal kullanıcı metnini kullan)
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
    # Verify and delete conversation
    result = await db.conversations.delete_one({
        'id': conversation_id,
        'user_id': current_user.id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete all messages
    await db.messages.delete_many({'conversation_id': conversation_id})
    
    return {'message': 'Conversation deleted'}

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
    client.close()