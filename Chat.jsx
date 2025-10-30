import ReactMarkdown from 'react-markdown';
// Derleme hatasına neden olan kısımlar yorum satırı yapıldı
// import rehypeHighlight from 'rehype-highlight'; 
// import 'highlight.js/styles/atom-one-dark.css'; 
// Söz dizimi vurgulama (syntax highlighting) için bu paketlerin projenize kurulması gerekir.

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { PlusCircle, Send, Image as ImageIcon, LogOut, Trash2, Menu, X } from 'lucide-react';

// KRİTİK DÜZELTME: process.env hatasını gidermek için URL sabit kodlandı
const BACKEND_URL = 'https://alpinetr-backend.onrender.com';
const API = `${BACKEND_URL}/api`;

export default function Chat({ token, user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Mobil uyumluluk için başlangıç değeri (md'den küçükse false)
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // EK DÜZELTME: Ekran boyutuna göre başlangıç sidebar durumunu ayarla (md breakpoint: 768px)
    const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        setSidebarOpen(!isMobile);
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);

    loadConversations();

    return () => window.removeEventListener('resize', handleResize);
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
      // Başlıkları truncating için temizle
      const cleanedConversations = response.data.map(conv => ({
        ...conv,
        title: conv.title.length > 30 ? conv.title.substring(0, 27) + '...' : conv.title
      }));
      setConversations(cleanedConversations);
      if (cleanedConversations.length > 0 && !currentConversation) {
        setCurrentConversation(cleanedConversations[0]); 
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
      // Başlığı temizle
      const newConv = {
        ...response.data,
        title: response.data.title.length > 30 ? response.data.title.substring(0, 27) + '...' : response.data.title
      };

      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
      toast.success('New conversation started');
      
      if (window.innerWidth < 768) {
          setSidebarOpen(false);
      }
      
      return newConv;
    } catch (error) {
      toast.error('Failed to create conversation');
      return null;
    }
  };

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

      setSelectedImage(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
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

  const sendMessage = async () => {
    let conv = currentConversation;
    if (!inputMessage.trim() && !selectedImage) return;

    if (!conv) {
      conv = await createNewConversation();
      if (!conv) return;
    }

    setLoading(true);
    const messageToSend = inputMessage;
    const fileToSend = selectedImage;

    // Geçici kullanıcı mesajı (optimistik güncelleme)
    const tempUserMessage = {
      id: Date.now().toString(),
      conversation_id: conv.id,
      role: 'user',
      content: messageToSend + (fileToSend ? ` [Yüklenen Dosya: ${fileToSend.name} (${fileToSend.type})]` : ''),
      created_at: new Date().toISOString(),
      has_image: fileToSend && fileToSend.type.startsWith('image/'),
      // Önizleme verisini base64 kısmı olarak al (API'den gelene kadar gösterim için)
      image_data: imagePreview ? imagePreview : null, 
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    // Inputları temizle
    setInputMessage('');
    removeImage(); 

    const formData = new FormData();
    formData.append('conversation_id', conv.id);
    formData.append('message', messageToSend);
    
    if (fileToSend) {
      formData.append('file', fileToSend);
    }
    
    try {
      const response = await axios.post(`${API}/chat/message`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Geçici mesajı kaldır ve gerçek mesajları ekle
      setMessages((prev) => {
        const newMessages = prev.filter(msg => msg.id !== tempUserMessage.id);
        return [...newMessages, response.data.user_message, response.data.assistant_message];
      });

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

  // Avatar Component Eşdeğeri
  const SimpleAvatar = ({ children, className, onClick }) => (
    <div 
      className={`w-10 h-10 rounded-full flex items-center justify-center ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Sidebar */}
      <div
        className={`${
          // Mobil: Tam ekran, Mutlak konumlu (absolute), Z-index 20
          // Masaüstü (md ve üzeri): 80 genişlik, Göreceli konumlu (relative)
          sidebarOpen ? 'w-full md:w-80 absolute z-20 md:relative' : 'w-0'
        } transition-all duration-300 bg-white/95 backdrop-blur-md border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0 h-full`}
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
            {/* Sidebar açıkken mobil cihazda kapatma düğmesi */}
            {sidebarOpen && window.innerWidth < 768 && (
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                    aria-label="Kapat"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
          </div>

          <button
            onClick={createNewConversation}
            className="w-full h-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center" 
            data-testid="new-chat-button"
            style={{fontFamily: 'Inter, sans-serif'}}
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            New Chat
          </button>
        </div>

        {/* Konuşmalar Listesi */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                    setCurrentConversation(conv);
                    // Mobil cihazda sohbet seçildiğinde sidebar'ı kapat
                    if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                    }
                }}
                className={`p-3 rounded-lg cursor-pointer group transition-all duration-200 flex items-center justify-between ${
                  currentConversation?.id === conv.id
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 shadow-sm ring-2 ring-indigo-300' 
                    : 'hover:bg-gray-100'
                }`}
                data-testid={`conversation-${conv.id}`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-medium text-sm truncate" style={{fontFamily: 'Inter, sans-serif'}}>{conv.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 rounded-full hover:bg-red-50"
                  data-testid={`delete-conversation-${conv.id}`}
                >
                  <Trash2 className="w-4 h-4 text-red-500 hover:text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Kullanıcı Bilgisi ve Çıkış */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50">
            <SimpleAvatar className="bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold">
              {user.full_name.charAt(0).toUpperCase()}
            </SimpleAvatar>
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
        <div className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              data-testid="toggle-sidebar"
            >
              {/* Mobil: Sidebar açıksa X, kapalıysa Menü ikonu göster */}
              {sidebarOpen && window.innerWidth < 768 ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              {currentConversation?.title || 'Alpine AI'}
            </h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto">
          {messages.length === 0 && !loading ? (
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
                Your intelligent assistant. Ask me anything or upload an image/document to get started!
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
                    <SimpleAvatar className="mt-1 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex-shrink-0">
                      A
                    </SimpleAvatar>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] p-4 ${ 
                      msg.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-xl'
                          : 'bg-white rounded-2xl rounded-tl-sm shadow-md border border-gray-100'
                    }`}
                  >
                    {msg.has_image && msg.image_data && (
                      <img
                        // image_data base64 olarak gelir. Temp mesajda dataURL, API mesajında sade base64'tür.
                        src={msg.image_data.startsWith('data:image') ? msg.image_data : `data:image/jpeg;base64,${msg.image_data}`}
                        alt="Uploaded"
                        className="rounded-lg mb-3 max-w-full h-auto max-h-64 object-cover"
                      />
                    )}
                    <div
                      className={`whitespace-pre-wrap prose prose-sm max-w-none ${ 
                        msg.role === 'user' ? 'text-white prose-invert' : 'text-gray-800'
                      }`}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      <ReactMarkdown
                        // rehypePlugins={[rehypeHighlight]} // Bu satır derleme hatasına neden olduğu için yorum satırı yapıldı
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <SimpleAvatar className="mt-1 bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold flex-shrink-0">
                      {user.full_name.charAt(0).toUpperCase()}
                    </SimpleAvatar>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 justify-start" data-testid="loading-indicator">
                  <SimpleAvatar className="mt-1 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex-shrink-0">
                    A
                  </SimpleAvatar>
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
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            {/* DOSYA ÖNİZLEME ALANI */}
            {selectedImage && (
              <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-inner" data-testid="file-preview">
                <div className="flex items-center gap-3">
                  {selectedImage.type.startsWith('image/') && imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-300" />
                  ) : (
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
              </div>
            )}
            
            {/* MESAJ GİRİŞ ALANI */}
            <div className="flex gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,application/pdf,text/plain,.md"
                data-testid="file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 shadow-sm flex-shrink-0"
                disabled={loading}
                data-testid="upload-file-button"
              >
                <ImageIcon className="w-6 h-6 text-gray-600" />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl text-base py-3 px-4 transition-all duration-200 outline-none" 
                data-testid="message-input"
                style={{fontFamily: 'Inter, sans-serif'}}
              />
              <button
                onClick={sendMessage}
                disabled={loading || (!inputMessage.trim() && !selectedImage)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0" 
                data-testid="send-button"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
