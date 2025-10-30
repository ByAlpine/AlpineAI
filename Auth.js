// DÜZELTME: Tüm 'import'lar kaldırıldı.
// Gerekli fonksiyonları 'index.html'de yüklenen global 'window' nesnesinden alıyoruz.
const { useState } = React;
const { toast } = Sonner;
// 'axios' zaten global olarak 'window.axios' şeklinde yüklendi.

// DÜZELTME: 'export default' kaldırıldı.
// Fonksiyonu 'window' nesnesine atayarak global hale getiriyoruz.
window.Auth = function ({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: ''
  });
  const [loading, setLoading] = useState(false);

  // DÜZELTME: API yolu, backend 'server.py' ile aynı yerde çalıştığı için göreli olmalı.
  const BASE_API = '/api';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      // 'axios' (window.axios) ile API'ye istek at
      const response = await axios.post(`${BASE_API}${endpoint}`, payload);
      
      // 'Sonner.toast' (window.Sonner.toast) ile bildirim göster
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      
      onLogin(response.data.token, response.data.user);

    } catch (error) {
      toast.error(error.response?.data?.detail || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Alpine AI</h1>
          <p className="text-gray-600 mt-2" style={{fontFamily: 'Inter, sans-serif'}}>Your intelligent assistant powered by Gemini</p>
        </div>

        {/* DÜZELTME: <Card> bileşenleri standart <div>, <h2>, <p> etiketleriyle değiştirildi. */}
        <div className="border-0 shadow-xl backdrop-blur-sm bg-white/80 rounded-lg border bg-card text-card-foreground" data-testid="auth-card">
          <div className="p-6">
            <h2 className="text-2xl font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-muted-foreground" style={{fontFamily: 'Inter, sans-serif'}}>
              {isLogin ? 'Sign in to continue your conversations' : 'Get started with Alpine AI'}
            </p>
          </div>
          <div className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  {/* DÜZELTME: <Label> -> <label> */}
                  <label htmlFor="full_name" style={{fontFamily: 'Inter, sans-serif'}}>Full Name</label>
                  {/* DÜZELTME: <Input> -> <input> */}
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={handleChange}
                    required={!isLogin}
                    data-testid="full-name-input"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="email" style={{fontFamily: 'Inter, sans-serif'}}>Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="email-input"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" style={{fontFamily: 'Inter, sans-serif'}}>Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="password-input"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* DÜZELTME: <Button> -> <button> */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                disabled={loading}
                data-testid="submit-button"
                style={{fontFamily: 'Inter, sans-serif'}}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                data-testid="toggle-auth-mode"
                style={{fontFamily: 'Inter, sans-sa' }}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
