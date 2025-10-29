import React, { useState } from 'react';
import axios from 'axios';
// DÜZELTİLDİ: Mutlak yollar göreli yollara çevrildi
import { Button } from './components/ui/button'; 
import { Input } from './components/ui/input'; 
import { Label } from './components/ui/label'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Auth({ onLogin }) {
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
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'An error occurred');
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

        <Card className="border-0 shadow-xl backdrop-blur-sm bg-white/80" data-testid="auth-card">
          <CardHeader>
            <CardTitle className="text-2xl" style={{fontFamily: 'Space Grotesk, sans-serif'}}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription style={{fontFamily: 'Inter, sans-serif'}}>
              {isLogin ? 'Sign in to continue your conversations' : 'Get started with Alpine AI'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="full_name" style={{fontFamily: 'Inter, sans-serif'}}>Full Name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={handleChange}
                    required={!isLogin}
                    data-testid="full-name-input"
                    className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" style={{fontFamily: 'Inter, sans-serif'}}>Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  data-testid="email-input"
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" style={{fontFamily: 'Inter, sans-serif'}}>Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  data-testid="password-input"
                  className="border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                disabled={loading}
                data-testid="submit-button"
                style={{fontFamily: 'Inter, sans-serif'}}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                data-testid="toggle-auth-mode"
                style={{fontFamily: 'Inter, sans-serif'}}
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
