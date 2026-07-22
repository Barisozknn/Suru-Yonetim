import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowRight } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const setIsGuest = useStore((state) => state.setIsGuest);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      // E-posta doğrulaması kapalı olduğu için direkt giriş yapılıp yönlendirilir
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-earth-200 max-w-md w-full">
        <h2 className="text-3xl font-black text-nature-800 text-center mb-6">SürüMetri</h2>
        <h3 className="text-xl font-bold text-earth-900 text-center mb-6">Kayıt Ol</h3>
        
        <>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-earth-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-earth-50 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-earth-700 mb-1">Şifre (En az 6 karakter)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-earth-50 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-nature-600 hover:bg-nature-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Kayıt Olunuyor...' : 'Kayıt Ol'}
              </button>
            </form>

            <div className="mt-4">
              <button
                onClick={() => {
                  setIsGuest(true);
                  navigate('/');
                }}
                type="button"
                className="w-full flex items-center justify-center space-x-2 bg-earth-100 hover:bg-earth-200 text-earth-800 font-bold py-3 rounded-lg transition"
              >
                <span>Kaydolmadan Devam Et</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 text-center text-sm font-medium text-earth-600">
            Zaten hesabın var mı? <Link to="/login" className="text-nature-600 hover:underline">Giriş Yap</Link>
          </div>
        </>
      </div>
    </div>
  );
};

export default Register;
