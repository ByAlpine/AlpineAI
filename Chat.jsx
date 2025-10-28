import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlusCircle, Send, Image as ImageIcon, LogOut, Trash2, Menu, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Chat({ token, user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // Artık Base64 değil, File objesi tutacak
  const [imagePreview, setImagePreview] = useState(null); // Sadece resimler için Base64 URL tutacak
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
      if (response.data.length > 0 && !currentConversation) {
        setCurrentConversation(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await axios.get(`${API}/chat/conversation/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await axios.post(
        `${API}/chat/conversation`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations([response.data, ...conversations]);
      setCurrentConversation(response.data);
      setMessages([]);
      toast.success('New conversation started');
      return response.data; // Yeni konuşmayı döndür
    } catch (error) {
      toast.error('Failed to create conversation');
      return null;
    }
  };

  // Yeni dosya yükleme fonksiyonu
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB');
        e.target.value = '';
        setSelectedImage(null);
        setImagePreview(null);
        return;
      }

      setSelectedImage(file); // File objesini kaydet

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Base64 URL'i sadece görsel önizlemesi için kullan
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null); // Görsel olmayan dosyalar için önizlemeyi temizle
      }
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Güncellenmiş sendMessage fonksiyonu
  const sendMessage = async () => {
    let conv = currentConversation;
    if (!inputMessage.trim() && !selectedImage) return;

    // Eğer bir konuşma yoksa, yeni bir tane oluştur
    if (!conv) {
      conv = await createNewConversation();
      if (!conv) return; // Konuşma oluşturulamazsa dur
    }

    setLoading(true);
    const messageToSend = inputMessage;
    const fileToSend = selectedImage; // File object

    // 1. Kullanıcı mesajını anında UI'a ekle (Gecikmeyi azaltmak için)
    const tempUserMessage = {
      id: Date.now().toString(), // Geçici ID
      conversation_id: conv.id,
      role: 'user',
      // Dosya adını mesaj içeriğine ekle
      content: messageToSend + (fileToSend ? ` [Yüklenen Dosya: ${fileToSend.name} (${fileToSend.type})]` : ''),
      created_at: new Date().toISOString(),
      has_image: fileToSend && fileToSend.type.startsWith('image/'),
      image_data: null, // Base64 kodlamasını backend'den alacağız
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    // Inputları ve önizlemeyi temizle
    setInputMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }

    // 2. FormData oluştur ve mesaj/dosyayı ekle
    const formData = new FormData();
    formData.append('conversation_id', conv.id);
    formData.append('message', messageToSend);
    
    if (fileToSend) {
      // Backend'e 'file' adıyla gönderiyoruz.
      formData.append('file', fileToSend);
    }
    
    try {
      // 3. Mesajı multipart/form-data olarak gönder
      const response = await axios.post(`${API}/chat/message`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          // Content-Type: 'multipart/form-data' axios tarafından otomatik olarak ayarlanır.
        },
      });

      // 4. Geçici mesajı kaldır ve gerçek mesajları ekle
      setMessages((prev) => {
        // Geçici mesajı filtrele
        const newMessages = prev.filter(msg => msg.id !== tempUserMessage.id);
        // Gerçek kullanıcı mesajını (backend'den gelen) ve asistan yanıtını ekle
        return [...newMessages, response.data.user_message, response.data.assistant_message];
      });

      // 5. Konuşma listesini ve varsa başlığı güncelle
      loadConversations();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.detail || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      
      // Hata durumunda geçici mesajı kaldır 
      setMessages((prev) => prev.filter(msg => msg.id !== tempUserMessage.id));
      
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/chat/conversation/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      if (currentConversation?.id === convId) {
        setCurrentConversation(updated[0] || null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col overflow-hidden`}
        data-testid="sidebar"
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Alpine</h2>
              </div>
            </div>
          </div>

          <Button
            onClick={createNewConversation}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
            data-testid="new-chat-button"
            style={{fontFamily: 'Inter, sans-serif'}}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setCurrentConversation(conv)}
                className={`p-3 rounded-lg cursor-pointer group transition-all duration-200 ${
                  currentConversation?.id === conv.id
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 shadow-sm'
                    : 'hover:bg-gray-100'
                }`}
                data-testid={`conversation-${conv.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{fontFamily: 'Inter, sans-serif'}}>{conv.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    data-testid={`delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-semibold">
                {user.full_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{fontFamily: 'Inter, sans-serif'}}>{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="toggle-sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              {currentConversation?.title || 'Alpine AI'}
            </h1>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4" data-testid="empty-state">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
                Welcome to Alpine AI
              </h2>
              <p className="text-gray-600 max-w-md" style={{fontFamily: 'Inter, sans-serif'}}>
                Your intelligent assistant powered by Gemini 2.5 Pro. Ask me anything or upload an image/document to get started!
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                  data-testid={`message-${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="mt-1">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold">
                        A
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-white rounded-2xl rounded-tl-sm shadow-md border border-gray-100'
                    } p-4`}
                  >
                    {msg.has_image && msg.image_data && (
                      <img
                        src={`data:image/jpeg;base64,${msg.image_data}`}
                        alt="Uploaded"
                        className="rounded-lg mb-3 max-w-full"
                      />
                    )}
                    <div
                     className={`whitespace-pre-wrap ${
                     msg.role === 'user' ? 'text-white' : 'text-gray-800'
                     }`}
                     style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <ReactMarkdown
                       rehypePlugins={[rehypeHighlight]} // Kod bloklarını vurgulamak için
                      >
                       {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="mt-1">
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 justify-start" data-testid="loading-indicator">
                  <Avatar className="mt-1">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white rounded-2xl rounded-tl-sm shadow-md border border-gray-100 p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            {/* GÜNCELLENMİŞ DOSYA ÖNİZLEME ALANI */}
            {selectedImage && (
              <Card className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" data-testid="file-preview">
                <div className="flex items-center gap-3">
                  {selectedImage.type.startsWith('image/') && imagePreview ? (
                    // Görsel önizlemesi
                    <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    // Görsel olmayan dosya önizlemesi
                    <div className="w-16 h-16 rounded-lg bg-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold">
                      {selectedImage.type.includes('pdf') ? 'PDF' : selectedImage.type.includes('text') ? 'TXT' : 'FILE'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{fontFamily: 'Inter, sans-serif'}}>{selectedImage.name}</p>
                    <p className="text-xs text-gray-500">{Math.ceil(selectedImage.size / 1024 / 1024)} MB</p>
                  </div>
                  <button
                    onClick={removeImage}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    data-testid="remove-file-button"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </Card>
            )}
            
            {/* MESAJ GİRİŞ ALANI */}
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,text/plain,.md" // Dosya kabul tipleri güncellendi
                data-testid="file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                disabled={loading}
                data-testid="upload-file-button" // Test ID güncellendi
              >
                <ImageIcon className="w-6 h-6 text-gray-600" />
              </button>
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl text-base py-6"
                data-testid="message-input"
                style={{fontFamily: 'Inter, sans-serif'}}
              />
              <Button
                onClick={sendMessage}
                disabled={loading || (!inputMessage.trim() && !selectedImage)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
                data-testid="send-button"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}