/**
 * ALPINE AI CHAT APP - DERLENMİŞ NİHAİ TEK DOSYA
 * Router v6 + HashRouter (statik hostlar için), Show/Hide Password eklendi.
 */

// ----------------------------------------------------
// SADECE GLOBAL SABİTLER
const API = '/api';
const axios = window.axios;
const ReactDOM = window.ReactDOM;

// Router (v6)
const RRD = window.ReactRouterDOM;
const HashRouter = RRD?.HashRouter;
const Routes = RRD?.Routes;
const Route = RRD?.Route;
const Navigate = RRD?.Navigate;

if (!HashRouter || !Routes || !Route || !Navigate) {
  console.error('React Router DOM v6 yüklenemedi. CDN sırasını kontrol et.');
}

// --- Basit Icon Yedeği (Lucide yoksa) ---
const Icon = ({ name, className = 'w-5 h-5', size }) => {
  const cls = `inline-flex items-center justify-center ${className} font-bold text-gray-700`;
  let content = name ? name[0] : '?';
  if (name === 'X') content = '❌';
  if (name === 'Check') content = '✅';
  if (name === 'Send') content = '▶';
  if (name === 'LogOut') content = '🚪';
  if (name === 'MessageSquare') content = '💬';
  if (name === 'Plus') content = '+';
  if (name === 'Trash2') content = '🗑️';
  if (name === 'Menu') content = '☰';
  if (name === 'Eye') content = '👁️';
  if (name === 'EyeOff') content = '🙈';

  return React.createElement(
    'span',
    { className: cls, style: size ? { width: size, height: size } : {} },
    content
  );
};

// ============================= AUTH =============================
const Auth = function ({ onLogin }) {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const endpoint = isLogin ? `${API}/auth/login` : `${API}/auth/register`;
    const data = isLogin ? { email, password } : { email, password, full_name: fullName };

    try {
      const response = await axios.post(endpoint, data);

      if (response.data.access_token) {
        onLogin(response.data.access_token, response.data.user);
      } else {
        setError('Beklenmedik bir hata oluştu.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Bir hata oluştu. Lütfen tekrar deneyin.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    if (!email || !password) return false;
    if (!isLogin && !fullName) return false;
    return true;
  };

  const inputClass =
    'w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 ease-in-out';
  const buttonClass = `w-full p-3 text-white font-semibold rounded-lg transition duration-300 ease-in-out ${
    isFormValid() && !isLoading ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' : 'bg-blue-300 cursor-not-allowed'
  }`;
  const linkClass = 'text-blue-600 hover:text-blue-800 font-medium transition duration-150 ease-in-out';

  return React.createElement(
    'div',
    { className: 'flex items-center justify-center min-h-screen bg-gray-50' },
    React.createElement(
      'div',
      { className: 'w-full max-w-md p-8 space-y-8 bg-white shadow-xl rounded-2xl' },
      React.createElement('h2', { className: 'text-center text-3xl font-bold text-gray-900' }, isLogin ? 'Giriş Yap' : 'Kayıt Ol'),
      error && React.createElement('div', { className: 'p-3 text-sm font-medium text-red-700 bg-red-100 rounded-lg' }, error),
      React.createElement(
        'form',
        { className: 'mt-8 space-y-6', onSubmit: handleSubmit },
        !isLogin &&
          React.createElement(
            'div',
            null,
            React.createElement('label', { htmlFor: 'full-name', className: 'sr-only' }, 'Ad Soyad'),
            React.createElement('input', {
              id: 'full-name',
              name: 'full-name',
              type: 'text',
              required: true,
              className: inputClass,
              placeholder: 'Ad Soyad',
              value: fullName,
              onChange: (e) => setFullName(e.target.value)
            })
          ),
        React.createElement(
          'div',
          null,
          React.createElement('label', { htmlFor: 'email-address', className: 'sr-only' }, 'E-posta Adresi'),
          React.createElement('input', {
            id: 'email-address',
            name: 'email',
            type: 'email',
            required: true,
            className: inputClass,
            placeholder: 'E-posta Adresi',
            value: email,
            onChange: (e) => setEmail(e.target.value)
          })
        ),
        // Şifre + Göz ikonu
        React.createElement(
          'div',
          { className: 'relative' },
          React.createElement('label', { htmlFor: 'password', className: 'sr-only' }, 'Şifre'),
          React.createElement('input', {
            id: 'password',
            name: 'password',
            type: showPassword ? 'text' : 'password',
            required: true,
            className: inputClass,
            placeholder: 'Şifre',
            value: password,
            onChange: (e) => setPassword(e.target.value)
          }),
          React.createElement(
            'button',
            {
              type: 'button',
              className:
                'absolute inset-y-0 right-0 flex items-center px-3 text-sm font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              onClick: () => setShowPassword((prev) => !prev),
              'aria-label': showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'
            },
            React.createElement('span', { className: 'mr-1 hidden sm:inline' }, showPassword ? 'Gizle' : 'Göster'),
            showPassword
              ? React.createElement(Icon, { name: 'EyeOff', className: 'w-5 h-5' })
              : React.createElement(Icon, { name: 'Eye', className: 'w-5 h-5' })
          )
        ),
        React.createElement(
          'div',
          null,
          React.createElement(
            'button',
            { type: 'submit', disabled: !isFormValid() || isLoading, className: buttonClass },
            isLoading ? 'Yükleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'
          )
        ),
        React.createElement(
          'div',
          { className: 'text-center' },
          React.createElement(
            'a',
            {
              href: '#',
              className: linkClass,
              onClick: (e) => {
                e.preventDefault();
                setIsLogin(!isLogin);
                setError(null);
              }
            },
            isLogin ? 'Hesabınız yok mu? Kayıt Olun.' : 'Zaten hesabınız var mı? Giriş Yapın.'
          )
        )
      )
    )
  );
};

// ============================= CHAT =============================
const Chat = function ({ token, user, onLogout }) {
  const [conversations, setConversations] = React.useState([]);
  const [selectedConvId, setSelectedConvId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState(null);
  const messagesEndRef = React.useRef(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const Markdown = window.ReactMarkdown;
  const { useEffect, useCallback } = React;

  // Auth Header
  const getHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }),
    [token]
  );

  // Mesajlar ekranını en alta kaydırma
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  // Sohbetleri Yükleme
  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/chat/conversations`, { headers: getHeaders() });
      setConversations(response.data);
      if (response.data.length > 0 && !selectedConvId) {
        setSelectedConvId(response.data[0].id);
      } else if (response.data.length > 0 && selectedConvId) {
        const exists = response.data.some((conv) => conv.id === selectedConvId);
        if (!exists) setSelectedConvId(response.data[0].id);
      }
    } catch (err) {
      setError('Sohbetler yüklenirken bir hata oluştu.');
    }
  }, [getHeaders, selectedConvId]);

  // Mesajları Yükleme
  const fetchMessages = useCallback(
    async (convId) => {
      if (!convId) {
        setMessages([]);
        return;
      }
      try {
        const response = await axios.get(`${API}/chat/conversation/${convId}/messages`, { headers: getHeaders() });
        setMessages(response.data);
      } catch (err) {
        setError('Mesajlar yüklenirken bir hata oluştu.');
        setMessages([]);
      }
    },
    [getHeaders]
  );

  // Sohbet ve Mesajları senkronize et
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    fetchMessages(selectedConvId);
  }, [selectedConvId, fetchMessages]);

  // Yeni Sohbet Başlatma
  const startNewConversation = async () => {
    try {
      const response = await axios.post(`${API}/chat/conversation`, { title: 'Yeni Sohbet' }, { headers: getHeaders() });
      const newConv = response.data;
      setConversations([newConv, ...conversations]);
      setSelectedConvId(newConv.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (err) {
      setError('Yeni sohbet başlatılamadı.');
    }
  };

  // Mesaj Gönderme
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    let convId = selectedConvId;
    let newConvTitle = null;

    if (!convId && conversations.length === 0) {
      try {
        const response = await axios.post(`${API}/chat/conversation`, { title: input.substring(0, 30) }, { headers: getHeaders() });
        convId = response.data.id;
        newConvTitle = response.data.title;
        setConversations([response.data]);
        setSelectedConvId(convId);
      } catch (err) {
        setError('Yeni sohbet oluşturulurken hata.');
        return;
      }
    } else if (!convId) {
      convId = conversations[0].id;
      setSelectedConvId(convId);
    }

    const userMessage = {
      conversation_id: convId,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('conversation_id', convId);
      formData.append('message', userMessage.content);

      const response = await axios.post(`${API}/chat/message`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const ai = response.data.assistant_message;

      setMessages((prev) => [
        ...prev,
        {
          conversation_id: convId,
          role: 'assistant',
          content: ai.content,
          timestamp: ai.created_at
        }
      ]);

      if (newConvTitle && convId) {
        fetchConversations();
      }
    } catch (err) {
      setError('Mesaj gönderilirken bir hata oluştu.');
      setMessages((prev) => prev.slice(0, prev.length - 1));
    } finally {
      setIsSending(false);
    }
  };

  // Sohbet Silme
  const handleDeleteConversation = async () => {
    if (!selectedConvId) return;

    try {
      await axios.delete(`${API}/chat/conversation/${selectedConvId}`, { headers: getHeaders() });

      const updatedConversations = conversations.filter((conv) => conv.id !== selectedConvId);
      setConversations(updatedConversations);

      if (updatedConversations.length > 0) {
        setSelectedConvId(updatedConversations[0].id);
      } else {
        setSelectedConvId(null);
        setMessages([]);
      }
    } catch (err) {
      setError('Sohbet silinirken bir hata oluştu.');
    } finally {
      setShowDeleteModal(false);
    }
  };

  // Silme onayı Modal
  const LogoutModal = () =>
    React.createElement(
      'div',
      { className: 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50' },
      React.createElement(
        'div',
        { className: 'bg-white p-6 rounded-lg shadow-xl max-w-sm w-full' },
        React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Sohbeti Sil'),
        React.createElement('p', { className: 'mb-6 text-gray-600' }, 'Bu sohbeti kalıcı olarak silmek istediğinizden emin misiniz?'),
        React.createElement(
          'div',
          { className: 'flex justify-end space-x-3' },
          React.createElement(
            'button',
            { className: 'px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150', onClick: () => setShowDeleteModal(false) },
            'İptal'
          ),
          React.createElement(
            'button',
            { className: 'px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150', onClick: handleDeleteConversation },
            'Sil'
          )
        )
      )
    );

  // Mesaj Bileşeni
  const Message = ({ message }) => {
    const isUser = message.role === 'user';
    const msgClass = isUser
      ? 'bg-blue-500 text-white rounded-br-none'
      : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200';

    const components = {
      code({ inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match
          ? React.createElement(
              'pre',
              { className: 'p-4 rounded-lg bg-gray-800 overflow-x-auto text-sm', ...props },
              React.createElement('code', { className: className, ...props }, String(children).replace(/\n$/, ''))
            )
          : React.createElement('code', { className: 'bg-gray-200 text-red-600 px-1 py-0.5 rounded text-sm', ...props }, children);
      },
      p({ children, ...props }) {
        return React.createElement('p', { className: 'mb-4', ...props }, children);
      },
      li({ children, ...props }) {
        return React.createElement('li', { className: 'mb-1 ml-4 list-disc', ...props }, children);
      }
    };

    return React.createElement(
      'div',
      { className: `flex ${isUser ? 'justify-end' : 'justify-start'} mb-6'` },
      React.createElement(
        'div',
        { className: `max-w-3xl px-4 py-3 rounded-xl shadow-md ${msgClass}` },
        window.ReactMarkdown?.default
          ? React.createElement(window.ReactMarkdown.default, {
              children: message.content,
              className: isUser ? 'text-sm' : 'markdown-content text-sm',
              components
            })
          : React.createElement('p', null, message.content)
      )
    );
  };

  const activeConvTitle = conversations.find((c) => c.id === selectedConvId)?.title || 'Yeni Sohbet';

  return React.createElement(
    'div',
    { className: 'flex h-screen antialiased bg-gray-50' },
    // Sidebar
    React.createElement(
      'div',
      {
        className: `fixed z-30 inset-y-0 left-0 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 transition duration-300 ease-in-out md:flex md:flex-col w-64 bg-white border-r border-gray-200 shadow-xl md:shadow-none`
      },
      // Sidebar Header
      React.createElement(
        'div',
        { className: 'p-4 flex items-center justify-between border-b border-gray-200' },
        React.createElement(
          'h3',
          { className: 'text-lg font-bold text-gray-800 flex items-center' },
          React.createElement(Icon, { name: 'MessageSquare', className: 'w-5 h-5 mr-2 text-blue-600' }),
          'Konuşmalar'
        ),
        React.createElement(
          'button',
          { className: 'md:hidden text-gray-500 hover:text-gray-700', onClick: () => setSidebarOpen(false) },
          React.createElement(Icon, { name: 'X', className: 'w-6 h-6' })
        )
      ),
      // Yeni Sohbet
      React.createElement(
        'div',
        { className: 'p-4' },
        React.createElement(
          'button',
          {
            className:
              'w-full flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition duration-150',
            onClick: startNewConversation
          },
          React.createElement(Icon, { name: 'Plus', className: 'w-5 h-5 mr-2' }),
          'Yeni Sohbet'
        )
      ),
      // Sohbet Listesi
      React.createElement(
        'nav',
        { className: 'flex-1 overflow-y-auto px-4 space-y-2 pb-4' },
        conversations.map((conv) =>
          React.createElement(
            'a',
            {
              key: conv.id,
              href: '#',
              className: `flex items-center p-3 rounded-xl transition duration-150 ${
                conv.id === selectedConvId ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`,
              onClick: (e) => {
                e.preventDefault();
                setSelectedConvId(conv.id);
                setSidebarOpen(false);
              }
            },
            React.createElement(Icon, { name: 'MessageSquare', className: 'w-4 h-4 mr-3 flex-shrink-0' }),
            React.createElement('span', { className: 'truncate text-sm' }, conv.title)
          )
        )
      )
    ),

    // 2. Ana Chat Alanı
    React.createElement(
      'div',
      { className: 'flex-1 flex flex-col' },
      // Header
      React.createElement(
        'header',
        { className: 'sticky top-0 z-10 p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm' },
        React.createElement(
          'button',
          { className: 'md:hidden text-gray-600 hover:text-gray-800 mr-4', onClick: () => setSidebarOpen(true) },
          React.createElement(Icon, { name: 'Menu', className: 'w-6 h-6' })
        ),
        React.createElement('div', { className: 'flex-1' }, React.createElement('h2', { className: 'text-xl font-bold text-gray-900 truncate' }, activeConvTitle)),
        React.createElement(
          'div',
          { className: 'flex items-center space-x-3' },
          selectedConvId &&
            React.createElement(
              'button',
              { className: 'p-2 text-red-600 hover:bg-red-50 rounded-full transition duration-150', title: 'Sohbeti Sil', onClick: () => setShowDeleteModal(true) },
              React.createElement(Icon, { name: 'Trash2', className: 'w-5 h-5' })
            ),
          React.createElement(
            'button',
            { className: 'p-2 text-gray-600 hover:bg-gray-100 rounded-full transition duration-150', title: 'Çıkış Yap', onClick: onLogout },
            React.createElement(Icon, { name: 'LogOut', className: 'w-5 h-5' })
          )
        )
      ),

      // Mesaj Akışı
      React.createElement(
        'main',
        { className: 'flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50' },
        messages.map((msg, index) => React.createElement(Message, { key: index, message: msg })),
        isSending &&
          React.createElement(
            'div',
            { className: 'flex justify-start mb-6' },
            React.createElement(
              'div',
              { className: 'max-w-3xl px-4 py-3 rounded-xl shadow-md bg-gray-100' },
              React.createElement(
                'div',
                { className: 'flex space-x-1' },
                React.createElement('div', { className: 'w-2 h-2 bg-gray-500 rounded-full animate-bounce', style: { animationDelay: '0s' } }),
                React.createElement('div', { className: 'w-2 h-2 bg-gray-500 rounded-full animate-bounce', style: { animationDelay: '0.2s' } }),
                React.createElement('div', { className: 'w-2 h-2 bg-gray-500 rounded-full animate-bounce', style: { animationDelay: '0.4s' } })
              )
            )
          ),
        !selectedConvId &&
          messages.length === 0 &&
          React.createElement(
            'div',
            { className: 'h-full flex items-center justify-center' },
            React.createElement(
              'div',
              { className: 'text-center text-gray-500' },
              React.createElement(Icon, { name: 'MessageSquare', className: 'w-10 h-10 mx-auto mb-3 text-blue-400' }),
              React.createElement('p', { className: 'text-lg font-medium' }, 'Yeni bir sohbet başlatın veya mesajınızı yazın.')
            )
          ),
        React.createElement('div', { ref: messagesEndRef })
      ),

      // Mesaj Giriş Alanı
      React.createElement(
        'footer',
        { className: 'p-4 bg-white border-t border-gray-200' },
        React.createElement(
          'form',
          { className: 'flex items-center space-x-3', onSubmit: handleSend },
          React.createElement('textarea', {
            className:
              'flex-1 resize-none p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150',
            rows: 1,
            placeholder: 'Mesajınızı yazın...',
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyDown: (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            },
            disabled: isSending
          }),
          React.createElement(
            'button',
            {
              type: 'submit',
              className: `p-3 rounded-full text-white transition duration-300 ${
                input.trim() && !isSending ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
              }`,
              disabled: !input.trim() || isSending
            },
            isSending
              ? React.createElement('div', {
                  className: 'w-5 h-5 border-2 border-white border-t-transparent border-solid rounded-full animate-spin'
                })
              : React.createElement(Icon, { name: 'Send', className: 'w-5 h-5' })
          )
        )
      )
    ),

    // Modal
    showDeleteModal && React.createElement(LogoutModal, null)
  );
};

// ============================= APP =============================
const App = function () {
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const [user, setUser] = React.useState(JSON.parse(localStorage.getItem('user') || 'null'));

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

  if (!HashRouter || !Routes || !Route || !Navigate) {
    return React.createElement(
      'div',
      { className: 'p-10 text-center text-red-600 font-bold' },
      'KRİTİK HATA: React Router DOM yüklü değil. index.html dosyasındaki CDN sırasını kontrol edin.'
    );
  }

  return React.createElement(
    HashRouter,
    null,
    React.createElement(
      Routes,
      null,
      React.createElement(Route, {
        path: '/',
        element: token
          ? React.createElement(Chat, { token: token, user: user, onLogout: handleLogout })
          : React.createElement(Navigate, { to: '/auth', replace: true })
      }),
      React.createElement(Route, {
        path: '/auth',
        element: token
          ? React.createElement(Navigate, { to: '/', replace: true })
          : React.createElement(Auth, { onLogin: handleLogin })
      }),
      React.createElement(Route, {
        path: '*',
        element: React.createElement(Navigate, { to: token ? '/' : '/auth', replace: true })
      })
    )
  );
};

// 💥 KODUN BAŞLATILMASI
const container = document.getElementById('root');
if (container && window.ReactDOM && window.ReactDOM.createRoot) {
  window.ReactDOM.createRoot(container).render(
    React.createElement(React.StrictMode, null, React.createElement(App, null))
  );
} else {
  console.error('KRİTİK HATA: React 18 createRoot bulunamadı.');
}
