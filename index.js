// DÜZELTME: Tüm 'import'lar kaldırıldı.
// Gerekli fonksiyonları 'index.html'de yüklenen global 'window' nesnesinden alıyoruz.
const { useState, useEffect } = React;
// 'react-router-dom' eşdeğerleri 'index.html'de yüklenen window.ReactRouterDOM nesnesinden gelir
const { BrowserRouter, Routes, Route, Navigate } = window.ReactRouterDOM;

// DÜZELTME: './Auth' ve './Chat' yerine global fonksiyonları kullanacağız.
// Bu fonksiyonlar 'Auth.jsx' ve 'Chat.jsx' dosyalarında window.Auth ve window.Chat olarak tanımlanmıştır.
const Auth = window.Auth;
const Chat = window.Chat;

// DÜZELTME: Toaster artık global olarak 'window.Sonner.Toaster' üzerinden erişilebilir, ancak
// Chat bileşeninin kendisinde zaten 'window.Sonner.toast' kullanıldığı için burada sadece div içinde
// render edeceğiz veya bu satırı kaldıracağız. Basitlik için sadece global Toaster'a güveniyoruz.
const Toaster = window.Sonner.Toaster; 

// KRİTİK DÜZELTME: process.env hatasını gidermek için URL sabit kodlandı
const BACKEND_URL = 'https://alpinetr-backend.onrender.com';
const API = `${BACKEND_URL}/api`;

// DÜZELTME: 'export default' kaldırıldı ve fonksiyon 'window' nesnesine atandı.
window.App = function() {
  const [token, setToken] = useState(localStorage.getItem('alpine_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      // DÜZELTME: axios yerine global fetch API'si kullanılıyor
      const response = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      setUser(data);

    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('alpine_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('alpine_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('alpine_token');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // NOTE: BrowserRouter kullanabilmek için 'index.html'e 'react-router-dom' kütüphanesini dahil ettik.
  return (
    <div className="App">
      {/* Toaster artık global olarak yüklendiği için burada kullanabiliriz */}
      <Toaster position="top-center" /> 
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              token && user ? (
                // DÜZELTME: Navigate artık global olarak erişilebilir.
                <Navigate to="/chat" replace />
              ) : (
                // DÜZELTME: Auth artık global olarak erişilebilir.
                <Auth onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/chat"
            element={
              token && user ? (
                // DÜZELTME: Chat artık global olarak erişilebilir.
                <Chat token={token} user={user} onLogout={handleLogout} />
              ) : (
                // DÜZELTME: Navigate artık global olarak erişilebilir.
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

// 'export default' kaldırıldı.