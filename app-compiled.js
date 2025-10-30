/**
 * ALPINE AI CHAT APP - DERLENMİŞ TEK DOSYA (JSX -> Saf JavaScript)
 * DÜZELTME NOTU: Tüm global çakışmalar giderildi ve App bileşeni en sonda global olarak atandı.
 */

// SADECE GLOBAL SABİTLER BURADA KALMALIDIR
const BACKEND_URL = 'https://alpinetr-backend.onrender.com';
const API = `${BACKEND_URL}/api`;
const BASE_API = '/api'; // Auth.js'den alınmıştır

// --- Auth Bileşeni (JSX'ten dönüştürülmüş) ---
const Auth = function ({ onLogin }) {
  // HOOK'lar ve KÜTÜPHANELERİN LOKAL TANIMLAMALARI (Çakışmayı önler)
  const useState = React.useState;
  const toast = Sonner.toast;
  const axios = window.axios; 

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? {
            email: formData.email,
            password: formData.password
          }
        : formData;

      // BASE_API kullanılıyor, Render'ın proxy yapması beklenir
      const response = await axios.post(`${BASE_API}${endpoint}`, payload);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return React.createElement(
    'div',
    {
      className: 'min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4'
    },
    React.createElement(
      'div',
      {
        className: 'w-full max-w-md'
      },
      React.createElement(
        'div',
        {
          className: 'text-center mb-8'
        },
        React.createElement(
          'div',
          {
            className: 'inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg'
          },
          React.createElement(
            'svg',
            {
              className: 'w-10 h-10 text-white',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24'
            },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: 2,
              d: 'M13 10V3L4 14h7v7l9-11h-7z'
            })
          )
        ),
        React.createElement(
          'h1',
          {
            className: 'text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent',
            style: {
              fontFamily: 'Space Grotesk, sans-serif'
            }
          },
          'Alpine AI'
        ),
        React.createElement(
          'p',
          {
            className: 'text-gray-600 mt-2',
            style: {
              fontFamily: 'Inter, sans-serif'
            }
          },
          'Your intelligent assistant powered by Gemini'
        )
      ),
      React.createElement(
        'div',
        {
          className: 'border-0 shadow-xl backdrop-blur-sm bg-white/80 rounded-lg border bg-card text-card-foreground',
          'data-testid': 'auth-card'
        },
        React.createElement(
          'div',
          {
            className: 'p-6'
          },
          React.createElement(
            'h2',
            {
              className: 'text-2xl font-bold',
              style: {
                fontFamily: 'Space Grotesk, sans-serif'
              }
            },
            isLogin ? 'Welcome Back' : 'Create Account'
          ),
          React.createElement(
            'p',
            {
              className: 'text-muted-foreground',
              style: {
                fontFamily: 'Inter, sans-serif'
              }
            },
            isLogin ? 'Sign in to continue your conversations' : 'Get started with Alpine AI'
          )
        ),
        React.createElement(
          'div',
          {
            className: 'p-6 pt-0'
          },
          React.createElement(
            'form',
            {
              onSubmit: handleSubmit,
              className: 'space-y-4'
            },
            !isLogin &&
              React.createElement(
                'div',
                {
                  className: 'space-y-2'
                },
                React.createElement(
                  'label',
                  {
                    htmlFor: 'full_name',
                    style: {
                      fontFamily: 'Inter, sans-serif'
                    }
                  },
                  'Full Name'
                ),
                React.createElement('input', {
                  id: 'full_name',
                  name: 'full_name',
                  type: 'text',
                  placeholder: 'John Doe',
                  value: formData.full_name,
                  onChange: handleChange,
                  required: !isLogin,
                  'data-testid': 'full-name-input',
                  className:
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
                })
              ),
            React.createElement(
              'div',
              {
                className: 'space-y-2'
              },
              React.createElement(
                'label',
                {
                  htmlFor: 'email',
                  style: {
                    fontFamily: 'Inter, sans-serif'
                  }
                },
                'Email'
              ),
              React.createElement('input', {
                id: 'email',
                name: 'email',
                type: 'email',
                placeholder: 'your@email.com',
                value: formData.email,
                onChange: handleChange,
                required: true,
                'data-testid': 'email-input',
                className:
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
              })
            ),
            React.createElement(
              'div',
              {
                className: 'space-y-2'
              },
              React.createElement(
                'label',
                {
                  htmlFor: 'password',
                  style: {
                    fontFamily: 'Inter, sans-serif'
                  }
                },
                'Password'
              ),
              React.createElement('input', {
                id: 'password',
                name: 'password',
                type: 'password',
                placeholder: '••••••••',
                value: formData.password,
                onChange: handleChange,
                required: true,
                'data-testid': 'password-input',
                className:
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
              })
            ),
            React.createElement(
              'button',
              {
                type: 'submit',
                className:
                  'w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                disabled: loading,
                'data-testid': 'submit-button',
                style: {
                  fontFamily: 'Inter, sans-serif'
                }
              },
              loading
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'
            )
          ),
          React.createElement(
            'div',
            {
              className: 'mt-6 text-center'
            },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setIsLogin(!isLogin),
                className:
                  'text-indigo-600 hover:text-indigo-700 font-medium transition-colors',
                'data-testid': 'toggle-auth-mode',
                style: {
                  fontFamily: 'Inter, sans-sa'
                }
              },
              isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'
            )
          )
        )
      )
    )
  );
};

// --- Chat Bileşeni (JSX'ten dönüştürülmüş) ---
const Chat = function ({ token, user, onLogout }) {
  // HOOK'lar ve KÜTÜPHANELERİN LOKAL TANIMLAMALARI (Çakışmayı önler)
  const useState = React.useState;
  const useEffect = React.useEffect;
  const useRef = React.useRef;
  const toast = Sonner.toast;
  const axios = window.axios;
  const ReactMarkdown = window.ReactMarkdown;
  const rehypeHighlight = window.rehypeHighlight;
  const Lucide = window.lucide;
  
  // İKONLAR (Lucide yüklenemezse varsayılan 'div' kullan)
  const PlusCircle = Lucide ? Lucide.PlusCircle : 'div';
  const Send = Lucide ? Lucide.Send : 'div';
  const ImageIcon = Lucide ? Lucide.Image : 'div';
  const LogOut = Lucide ? Lucide.LogOut : 'div';
  const Trash2 = Lucide ? Lucide.Trash2 : 'div';
  const Menu = Lucide ? Lucide.Menu : 'div';
  const X = Lucide ? Lucide.X : 'div';
  
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
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
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API}/chat/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const cleanedConversations = response.data.map((conv) => ({
        ...conv,
        title:
          conv.title.length > 30
            ? conv.title.substring(0, 27) + '...'
            : conv.title
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
      const response = await axios.get(
        `${API}/chat/conversation/${conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
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
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const newConv = {
        ...response.data,
        title:
          response.data.title.length > 30
            ? response.data.title.substring(0, 27) + '...'
            : response.data.title
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

    const tempUserMessage = {
      id: Date.now().toString(),
      conversation_id: conv.id,
      role: 'user',
      content:
        messageToSend +
        (fileToSend
          ? ` [Yüklenen Dosya: ${fileToSend.name} (${fileToSend.type})]`
          : ''),
      created_at: new Date().toISOString(),
      has_image: fileToSend && fileToSend.type.startsWith('image/'),
      image_data: imagePreview ? imagePreview : null
    };

    setMessages((prev) => [...prev, tempUserMessage]);
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
          Authorization: `Bearer ${token}`
        }
      });

      setMessages((prev) => {
        const newMessages = prev.filter((msg) => msg.id !== tempUserMessage.id);
        return [
          ...newMessages,
          response.data.user_message,
          response.data.assistant_message
        ];
      });

      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(
        error.response?.data?.detail ||
          'Mesaj gönderilemedi. Lütfen tekrar deneyin.'
      );

      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/chat/conversation/${convId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const updated = conversations.filter((c) => c.id !== convId);
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

  const SimpleAvatar = ({ children, className, onClick }) =>
    React.createElement(
      'div',
      {
        className: `w-10 h-10 rounded-full flex items-center justify-center ${className}`,
        onClick: onClick
      },
      children
    );

  const MessageRenderer = ({ msg }) => {
    const isUser = msg.role === 'user';
    const msgClasses = isUser
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-xl'
      : 'bg-white rounded-2xl rounded-tl-sm shadow-md border border-gray-100';
    const textClasses = isUser ? 'text-white prose-invert' : 'text-gray-800';

    return React.createElement(
      'div',
      {
        key: msg.id,
        className: `flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`,
        'data-testid': `message-${msg.role}`
      },
      msg.role === 'assistant' &&
        React.createElement(
          SimpleAvatar,
          {
            className:
              'mt-1 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex-shrink-0'
          },
          'A'
        ),
      React.createElement(
        'div',
        {
          className: `max-w-[85%] sm:max-w-[70%] p-4 ${msgClasses}`
        },
        msg.has_image &&
          msg.image_data &&
          React.createElement('img', {
            src: msg.image_data.startsWith('data:image')
              ? msg.image_data
              : `data:image/jpeg;base64,${msg.image_data}`,
            alt: 'Uploaded',
            className:
              'rounded-lg mb-3 max-w-full h-auto max-h-64 object-cover'
          }),
        React.createElement(
          'div',
          {
            className: `whitespace-pre-wrap prose prose-sm max-w-none ${textClasses}`,
            style: {
              fontFamily: 'Inter, sans-serif'
            }
          },
          React.createElement(
            ReactMarkdown,
            {
              rehypePlugins: [rehypeHighlight]
            },
            msg.content
          )
        )
      ),
      isUser &&
        React.createElement(
          SimpleAvatar,
          {
            className:
              'mt-1 bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold flex-shrink-0'
          },
          user.full_name.charAt(0).toUpperCase()
        )
    );
  };

  const EmptyState = () =>
    React.createElement(
      'div',
      {
        className:
          'h-full flex flex-col items-center justify-center text-center px-4',
        'data-testid': 'empty-state'
      },
      React.createElement(
        'div',
        {
          className:
            'w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl'
        },
        React.createElement(
          'svg',
          {
            className: 'w-12 h-12 text-white',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24'
          },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M13 10V3L4 14h7v7l9-11h-7z'
          })
        )
      ),
      React.createElement(
        'h2',
        {
          className:
            'text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent',
          style: {
            fontFamily: 'Space Grotesk, sans-serif'
          }
        },
        'Welcome to Alpine AI'
      ),
      React.createElement(
        'p',
        {
          className: 'text-gray-600 max-w-md',
          style: {
            fontFamily: 'Inter, sans-serif'
          }
        },
        'Your intelligent assistant. Ask me anything or upload an image/document to get started!'
      )
    );

  const LoadingIndicator = () =>
    React.createElement(
      'div',
      {
        className: 'flex gap-4 justify-start',
        'data-testid': 'loading-indicator'
      },
      React.createElement(
        SimpleAvatar,
        {
          className:
            'mt-1 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex-shrink-0'
        },
        'A'
      ),
      React.createElement(
        'div',
        {
          className:
            'bg-white rounded-2xl rounded-tl-sm shadow-md border border-gray-100 p-4'
        },
        React.createElement(
          'div',
          {
            className: 'flex gap-2'
          },
          React.createElement('div', {
            className: 'w-2 h-2 bg-blue-600 rounded-full animate-bounce',
            style: {
              animationDelay: '0ms'
            }
          }),
          React.createElement('div', {
            className: 'w-2 h-2 bg-indigo-600 rounded-full animate-bounce',
            style: {
              animationDelay: '150ms'
            }
          }),
          React.createElement('div', {
            className: 'w-2 h-2 bg-purple-600 rounded-full animate-bounce',
            style: {
              animationDelay: '300ms'
            }
          })
        )
      )
    );

  const FilePreview = () =>
    React.createElement(
      'div',
      {
        className:
          'mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-inner',
        'data-testid': 'file-preview'
      },
      React.createElement(
        'div',
        {
          className: 'flex items-center gap-3'
        },
        selectedImage.type.startsWith('image/') && imagePreview
          ? React.createElement('img', {
              src: imagePreview,
              alt: 'Preview',
              className:
                'w-16 h-16 rounded-lg object-cover border border-gray-300'
            })
          : React.createElement(
              'div',
              {
                className:
                  'w-16 h-16 rounded-lg bg-blue-200 flex items-center justify-center text-blue-800 text-xs font-semibold'
              },
              selectedImage.type.includes('pdf')
                ? 'PDF'
                : selectedImage.type.includes('text')
                ? 'TXT'
                : 'FILE'
            ),
        React.createElement(
          'div',
          {
            className: 'flex-1 min-w-0'
          },
          React.createElement(
            'p',
            {
              className: 'text-sm font-medium truncate',
              style: {
                fontFamily: 'Inter, sans-serif'
              }
            },
            selectedImage.name
          ),
          React.createElement(
            'p',
            {
              className: 'text-xs text-gray-500'
            },
            Math.ceil(selectedImage.size / 1024 / 1024),
            ' MB'
          )
        ),
        React.createElement(
          'button',
          {
            onClick: removeImage,
            className:
              'p-2 hover:bg-red-100 rounded-lg transition-colors',
            'data-testid': 'remove-file-button'
          },
          React.createElement(X, {
            className: 'w-4 h-4 text-red-500'
          })
        )
      )
    );

  return React.createElement(
    'div',
    {
      className:
        'flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
    },
    // Sidebar
    React.createElement(
      'div',
      {
        className: `${
          sidebarOpen ? 'w-full md:w-80 absolute z-20 md:relative' : 'w-0'
        } transition-all duration-300 bg-white/95 backdrop-blur-md border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0 h-full`,
        'data-testid': 'sidebar'
      },
      React.createElement(
        'div',
        {
          className: 'p-4 border-b border-gray-200'
        },
        React.createElement(
          'div',
          {
            className: 'flex items-center justify-between mb-4'
          },
          React.createElement(
            'div',
            {
              className: 'flex items-center gap-3'
            },
            React.createElement(
              'div',
              {
                className:
                  'w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg'
              },
              React.createElement(
                'svg',
                {
                  className: 'w-6 h-6 text-white',
                  fill: 'none',
                  stroke: 'currentColor',
                  viewBox: '0 0 24 24'
                },
                React.createElement('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: 2,
                  d: 'M13 10V3L4 14h7v7l9-11h-7z'
                })
              )
            ),
            React.createElement(
              'div',
              null,
              React.createElement(
                'h2',
                {
                  className: 'font-bold text-lg',
                  style: {
                    fontFamily: 'Space Grotesk, sans-serif'
                  }
                },
                'Alpine'
              )
            )
          ),
          sidebarOpen &&
            window.innerWidth < 768 &&
            React.createElement(
              'button',
              {
                onClick: () => setSidebarOpen(false),
                className:
                  'p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden',
                'aria-label': 'Kapat'
              },
              React.createElement(X, {
                className: 'w-5 h-5'
              })
            )
        ),
        React.createElement(
          'button',
          {
            onClick: createNewConversation,
            className:
              'w-full h-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center',
            'data-testid': 'new-chat-button',
            style: {
              fontFamily: 'Inter, sans-serif'
            }
          },
          React.createElement(PlusCircle, {
            className: 'w-5 h-5 mr-2'
          }),
          'New Chat'
        )
      ),
      // Konuşmalar Listesi
      React.createElement(
        'div',
        {
          className: 'flex-1 p-4 overflow-y-auto'
        },
        React.createElement(
          'div',
          {
            className: 'space-y-2'
          },
          conversations.map((conv) =>
            React.createElement(
              'div',
              {
                key: conv.id,
                onClick: () => {
                  setCurrentConversation(conv);
                  if (window.innerWidth < 768) {
                    setSidebarOpen(false);
                  }
                },
                className: `p-3 rounded-lg cursor-pointer group transition-all duration-200 flex items-center justify-between ${
                  currentConversation?.id === conv.id
                    ? 'bg-gradient-to-r from-blue-100 to-indigo-100 shadow-sm ring-2 ring-indigo-300'
                    : 'hover:bg-gray-100'
                }`,
                'data-testid': `conversation-${conv.id}`
              },
              React.createElement(
                'div',
                {
                  className: 'flex-1 min-w-0 pr-2'
                },
                React.createElement(
                  'p',
                  {
                    className: 'font-medium text-sm truncate',
                    style: {
                      fontFamily: 'Inter, sans-serif'
                    }
                  },
                  conv.title
                ),
                React.createElement(
                  'p',
                  {
                    className: 'text-xs text-gray-500 mt-1'
                  },
                  new Date(conv.updated_at).toLocaleDateString()
                )
              ),
              React.createElement(
                'button',
                {
                  onClick: (e) => deleteConversation(conv.id, e),
                  className:
                    'opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 rounded-full hover:bg-red-50',
                  'data-testid': `delete-conversation-${conv.id}`
                },
                React.createElement(Trash2, {
                  className: 'w-4 h-4 text-red-500 hover:text-red-600'
                })
              )
            )
          )
        )
      ),
      // Kullanıcı Bilgisi ve Çıkış
      React.createElement(
        'div',
        {
          className: 'p-4 border-t border-gray-200'
        },
        React.createElement(
          'div',
          {
            className:
              'flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50'
          },
          React.createElement(
            SimpleAvatar,
            {
              className:
                'bg-gradient-to-br from-purple-600 to-pink-600 text-white font-semibold'
            },
            user.full_name.charAt(0).toUpperCase()
          ),
          React.createElement(
            'div',
            {
              className: 'flex-1 min-w-0'
            },
            React.createElement(
              'p',
              {
                className: 'font-medium text-sm truncate',
                style: {
                  fontFamily: 'Inter, sans-serif'
                }
              },
              user.full_name
            ),
            React.createElement(
              'p',
              {
                className: 'text-xs text-gray-500 truncate'
              },
              user.email
            )
          ),
          React.createElement(
            'button',
            {
              onClick: onLogout,
              className:
                'p-2 hover:bg-red-100 rounded-lg transition-colors',
              'data-testid': 'logout-button'
            },
            React.createElement(LogOut, {
              className: 'w-5 h-5 text-red-500'
            })
          )
        )
      )
    ),
    // Main Chat Area
    React.createElement(
      'div',
      {
        className: 'flex-1 flex flex-col'
      },
      // Header
      React.createElement(
        'div',
        {
          className:
            'h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-6 shadow-sm flex-shrink-0'
        },
        React.createElement(
          'div',
          {
            className: 'flex items-center'
          },
          React.createElement(
            'button',
            {
              onClick: () => setSidebarOpen(true),
              className:
                'p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden mr-3',
              'aria-label': 'Menüyü Aç'
            },
            React.createElement(Menu, {
              className: 'w-6 h-6'
            })
          ),
          React.createElement(
            'h2',
            {
              className: 'text-lg font-semibold text-gray-800 truncate',
              style: {
                fontFamily: 'Space Grotesk, sans-serif'
              }
            },
            currentConversation ? currentConversation.title : 'New Chat'
          )
        ),
        React.createElement(
          'button',
          {
            onClick: createNewConversation,
            className:
              'hidden md:flex items-center text-indigo-600 hover:text-indigo-800 transition-colors',
            style: {
              fontFamily: 'Inter, sans-serif'
            }
          },
          React.createElement(PlusCircle, {
            className: 'w-5 h-5 mr-1'
          }),
          'New Chat'
        )
      ),
      // Messages Area
      React.createElement(
        'div',
        {
          className: 'flex-1 p-6 overflow-y-auto space-y-8',
          'data-testid': 'messages-area'
        },
        messages.length === 0 && !loading && React.createElement(EmptyState, null),
        messages.map((msg) => React.createElement(MessageRenderer, { msg: msg, key: msg.id })),
        loading && React.createElement(LoadingIndicator, null),
        React.createElement('div', { ref: messagesEndRef })
      ),
      // Input Area
      React.createElement(
        'div',
        {
          className: 'p-6 flex-shrink-0 bg-white/90 backdrop-blur-sm border-t border-gray-200'
        },
        React.createElement(
          'div',
          {
            className: 'max-w-4xl mx-auto'
          },
          selectedImage && React.createElement(FilePreview, null),
          React.createElement(
            'div',
            {
              className: 'flex items-end bg-white border border-gray-300 rounded-xl shadow-lg focus-within:ring-2 focus-within:ring-indigo-500 transition-all'
            },
            React.createElement(
              'button',
              {
                onClick: () => fileInputRef.current.click(),
                className: 'p-3 text-gray-500 hover:text-indigo-600 transition-colors flex-shrink-0',
                disabled: loading,
                'aria-label': 'Dosya Seç',
                'data-testid': 'upload-button'
              },
              React.createElement(ImageIcon, {
                className: 'w-6 h-6'
              })
            ),
            React.createElement('input', {
              type: 'file',
              ref: fileInputRef,
              onChange: handleFileChange,
              className: 'hidden',
              accept: 'image/*,application/pdf,text/plain'
            }),
            React.createElement('textarea', {
              value: inputMessage,
              onChange: (e) => setInputMessage(e.target.value),
              onKeyPress: handleKeyPress,
              placeholder: loading ? 'Please wait for the response...' : 'Message Alpine AI...',
              rows: 1,
              className:
                'flex-1 resize-none py-3 px-0 bg-transparent text-gray-800 placeholder-gray-500 focus:outline-none overflow-hidden h-auto max-h-40',
              disabled: loading,
              style: {
                fontFamily: 'Inter, sans-serif'
              },
              'data-testid': 'message-input'
            }),
            React.createElement(
              'button',
              {
                onClick: sendMessage,
                className: `p-3 m-1 rounded-lg transition-all flex-shrink-0 ${
                  (inputMessage.trim() || selectedImage) && !loading
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`,
                disabled: loading || (!inputMessage.trim() && !selectedImage),
                'aria-label': 'Gönder',
                'data-testid': 'send-button'
              },
              React.createElement(Send, {
                className: 'w-6 h-6'
              })
            )
          )
        )
      )
    )
  );
};

// --- App Bileşeni (JSX'ten dönüştürülmüş) ---
const App = function () {
  // HOOK'lar ve KÜTÜPHANELERİN LOKAL TANIMLAMALARI (Çakışmayı önler)
  const useState = React.useState;
  const useEffect = React.useEffect;
  const ReactRouterDOM = window.ReactRouterDOM;
  const BrowserRouter = ReactRouterDOM ? ReactRouterDOM.BrowserRouter : 'div';
  const Routes = ReactRouterDOM ? ReactRouterDOM.Routes : 'div';
  const Route = ReactRouterDOM ? ReactRouterDOM.Route : 'div';
  const Navigate = ReactRouterDOM ? ReactRouterDOM.Navigate : 'div';
  const Toaster = window.Sonner ? window.Sonner.Toaster : 'div';

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center min-h-screen text-lg font-bold' }, 'Loading...');
  }

  // App Bileşeni Artık React.createElement kullanıyor
  return React.createElement(
    BrowserRouter,
    null,
    React.createElement(Toaster, {
      position: 'bottom-center'
    }),
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        path: '/auth',
        element: token ? React.createElement(Navigate, { to: '/' }) : React.createElement(Auth, { onLogin: handleLogin })
      }),
      React.createElement(Route, {
        path: '/',
        element: token ? React.createElement(Chat, { token: token, user: user, onLogout: handleLogout }) : React.createElement(Navigate, { to: '/auth' })
      }),
      React.createElement(Route, {
        path: '*',
        element: React.createElement(Navigate, { to: '/' })
      })
    )
  );
};

// BU GLOBAL ATAMA ARTIK KOD BLOĞUNUN EN SONUNDA VE DOĞRU YERDE
window.App = App;
