import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setIsGuest = useStore((state) => state.setIsGuest);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-earth-200 dark:border-gray-700 max-w-md w-full">
        <h2 className="text-3xl font-black text-nature-800 dark:text-nature-200 text-center mb-6">SürüMetri</h2>
        <h3 className="text-xl font-bold text-earth-900 dark:text-gray-100 text-center mb-6">Giriş Yap</h3>
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-earth-50 dark:bg-gray-900 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-earth-50 dark:bg-gray-900 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nature-600 hover:bg-nature-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-4">
          <button
            onClick={() => {
              setIsGuest(true);
              navigate('/');
            }}
            type="button"
            className="w-full flex items-center justify-center space-x-2 bg-earth-100 dark:bg-gray-800 hover:bg-earth-200 text-earth-800 dark:text-gray-200 font-bold py-3 rounded-lg transition"
          >
            <span>Kaydolmadan Devam Et</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 text-center text-sm font-medium text-earth-600 dark:text-gray-400 space-y-2">
          <div><Link to="/forgot-password" className="text-nature-600 dark:text-nature-400 hover:underline">Şifremi unuttum</Link></div>
          <div>Hesabın yok mu? <Link to="/register" className="text-nature-600 dark:text-nature-400 hover:underline">Kayıt Ol</Link></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
