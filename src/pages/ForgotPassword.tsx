import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-earth-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-earth-200 max-w-md w-full">
        <h2 className="text-xl font-bold text-earth-900 text-center mb-6">Şifremi Unuttum</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}
        {message && <div className="bg-nature-50 text-nature-700 p-3 rounded-lg mb-4 text-sm font-medium">{message}</div>}
        
        <form onSubmit={handleReset} className="space-y-4">
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-nature-600 hover:bg-nature-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm font-medium text-earth-600">
          <Link to="/login" className="text-nature-600 hover:underline">Giriş Ekranına Dön</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
