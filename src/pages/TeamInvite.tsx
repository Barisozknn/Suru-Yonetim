import React, { useState } from 'react';
import { Mail, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TeamInvite: React.FC = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Gözlemci');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    
    // Davet simülasyonu
    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
      setEmail('');
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/ayarlar" className="p-2 bg-white rounded-full text-earth-600 hover:text-earth-900 shadow-sm border border-earth-200 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-earth-900 tracking-tight">Ekip Yönetimi</h1>
          <p className="text-earth-500 font-medium mt-1">Sisteme yeni bir üye davet edin</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6">
        {isSent ? (
          <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center space-y-3">
            <div className="bg-green-100 text-green-600 p-3 rounded-full inline-block">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-green-900">Davet Gönderildi!</h3>
            <p className="text-green-700">Davet e-postası başarıyla gönderildi. Kullanıcı e-postadaki linke tıklayarak {role} rolüyle sisteme erişebilir.</p>
            <button 
              onClick={() => setIsSent(false)} 
              className="mt-4 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
            >
              Yeni Bir Davet Gönder
            </button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-earth-700 mb-1">E-posta Adresi</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="veteriner@ornek.com"
                className="w-full p-3 border border-earth-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-earth-700 mb-1">Kullanıcı Rolü</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                <div 
                  onClick={() => setRole('Gözlemci')}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition ${role === 'Gözlemci' ? 'border-purple-500 bg-purple-50' : 'border-earth-200 hover:border-purple-300'}`}
                >
                  <div className="font-bold text-earth-900">Gözlemci</div>
                  <div className="text-xs text-earth-500 mt-1">Sadece verileri okuyabilir, işlem veya değişiklik yapamaz.</div>
                </div>

                <div 
                  onClick={() => setRole('Veteriner')}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition ${role === 'Veteriner' ? 'border-purple-500 bg-purple-50' : 'border-earth-200 hover:border-purple-300'}`}
                >
                  <div className="font-bold text-earth-900">Veteriner</div>
                  <div className="text-xs text-earth-500 mt-1">Sağlık ve üreme işlemlerini girebilir ve düzenleyebilir.</div>
                </div>

                <div 
                  onClick={() => setRole('Bakıcı')}
                  className={`cursor-pointer p-4 rounded-xl border-2 transition ${role === 'Bakıcı' ? 'border-purple-500 bg-purple-50' : 'border-earth-200 hover:border-purple-300'}`}
                >
                  <div className="font-bold text-earth-900">Bakıcı</div>
                  <div className="text-xs text-earth-500 mt-1">Süt ölçümleri ve yem çıkışlarını sisteme işleyebilir.</div>
                </div>
                
              </div>
            </div>

            <div className="pt-4 border-t border-earth-100 flex justify-end">
              <button 
                type="submit" 
                disabled={isSending || !email}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>{isSending ? 'Gönderiliyor...' : 'Davet Gönder'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};

export default TeamInvite;
