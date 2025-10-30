# =========================================================================
# GEREKLİ KÜTÜPHANE DEĞİŞİKLİKLERİ:
# =========================================================================
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
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

# ... (Geri kalan ortam değişkenleri ve başlangıç ayarları aynı kalır) ...

# =========================================================================
# YENİ: Gemini Client ve Helper Fonksiyonları
# =========================================================================

# Global Gemini Client
try:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    logging.error(f"Gemini istemcisi başlatılamadı: {e}")
    gemini_client = None


async def get_gemini_chat_history(conversation_id: str) -> List[Dict[str, Any]]:
    """
    MongoDB'den sohbet geçmişini (sadece rol ve içerik) alır.
    Bu geçmiş, Gemini'ya bağlam sağlamak için kullanılır.
    """
    messages = await db.messages.find(
        {'conversation_id': conversation_id},
        {'_id': 0, 'role': 1, 'content': 1, 'image_data': 1, 'has_image': 1}
    ).sort('created_at', 1).to_list(1000)

    history = []
    for msg in messages:
        # Gemini'ya göndermek için içerik listesi oluşturulur (multimodal destekler)
        parts = [msg['content']]
        
        if msg.get('has_image') and msg.get('image_data'):
            try:
                # Base64 string'i byte'a çevir
                image_bytes = base64.b64decode(msg['image_data'])
                # File objesi oluştur ve parts'a ekle (Gemini'da File API kullanmak daha iyidir)
                # Basit bir örnek için IO nesnesi ile doğrudan dosya yerine metin tabanlı bağlamı tercih edelim
                # VEYA, daha doğru bir yaklaşım olarak, burayı atlayıp sadece 'text' içeriğini kullanalım
                # çünkü history'ye eklenen image content'ler API'de düzgün çalışmayabilir.
                # En iyisi, önceki mesajları sadece metin olarak tutmak.
                pass 
                
            except Exception as e:
                logging.warning(f"Failed to decode image data for history: {e}")
                
        # Role mapping
        gemini_role = 'user' if msg['role'] == 'user' else 'model'
        
        # Sadece metin içeriğini history'ye ekle (basit bir yaklaşım)
        history.append({"role": gemini_role, "parts": [msg['content']]})
        
    return history


async def generate_title_from_message(first_message: str) -> str:
    """Uses Gemini to generate a short, descriptive title for a conversation (Güncellendi)."""
    if not gemini_client:
        return "New Chat Topic"
        
    system_instruction = "You are a title generator AI. Your sole purpose is to take the user's first message in a chat and generate a concise, descriptive, and human-readable title (max 5-7 words, NO punctuation marks like quotes or periods at the end). Respond ONLY with the title."
    
    try:
        response = await gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[f"Generate a title for this chat: '{first_message}'"],
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        
        # Temizleme
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

# ... (Auth endpoints'ler aynı kalır) ...

# =========================================================================
# CHAT ENDPOINT'İNDE KRİTİK DÜZELTME
# =========================================================================

@api_router.post("/chat/message")
async def send_message(
    chat_req: ChatMessageRequest = Depends(ChatMessageRequest.as_form), 
    file: Optional[UploadFile] = File(None), 
    current_user: User = Depends(get_current_user),
):
    """Handles sending a message (text and optional file) to the AI."""
    if not gemini_client:
        raise HTTPException(status_code=503, detail="Gemini hizmeti kullanıma hazır değil.")

    # 1. Konuşmanın kullanıcıya ait olduğunu doğrula
    conversation = await db.conversations.find_one({
        'id': chat_req.conversation_id,
        'user_id': current_user.id
    })
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
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
    uploaded_file = None # Gemini File API için

    if file and file.filename:
        file_bytes = await file.read()
        
        if file.content_type.startswith('image/'):
            # Base64 olarak kaydet
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')
            image_data_to_save = image_base64
            has_image_to_save = True
            
            # Yüklenen dosyayı Gemini File API'ye yükle (Önerilen yöntem)
            # NOT: Bu dosya upload'u maliyetli bir operasyondur. Basitleştirmek için doğrudan io.BytesIO kullanacağız.
            # Gerçek bir uygulamada, 'client.files.upload' kullanmak daha doğrudur.
            # Şimdilik Base64'ü doğrudan gönderelim (basitlik için).
            gemini_parts.append(genai.types.Part.from_bytes(data=file_bytes, mime_type=file.content_type))
            
        else:
            # Diğer dosya türleri (PDF, TXT)
            # Dosya içeriğini metin olarak oku ve mesaja ekle.
            # BU KISIM ŞU AN YORUM SATIRI BIRAKILIYOR.
            # Dosyalarınızı Gemini'a yüklemek için 'client.files.upload' kullanmanız gerekir.
            # Basit bir deneme için sadece metin içeriğini kullanıyoruz.
            user_message_content += f" (Dosya adı: {file.filename}, Tür: {file.content_type}. İçerik işlenmedi.)"
            

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
    # History zaten alındığı için, geçmişte kaç mesaj olduğuna bakılır.
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
        raise HTTPException(status_code=500, detail="AI'dan yanıt alınamadı. Lütfen API anahtarınızı kontrol edin.")
    except Exception as e:
        logging.error(f"Unexpected error during chat: {e}")
        raise HTTPException(status_code=500, detail="Beklenmedik bir hata oluştu.")

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
    
# ... (Diğer chat/delete_conversation ve alt kısımlar aynı kalır) ...


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

@app.get("/api")
async def api_root():
    """API'nin çalıştığını kontrol etmek için kök rota."""
    return {"detail": "API is Running."}
