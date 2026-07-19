import React, { useState } from 'react';
import DataManagement from '../components/DataManagement';
import { ShieldAlert, Users, Trash2, LogOut, CalendarClock, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { uremeAyarlari, setUremeAyarlari } = useStore();
  
  const [localUremeAyarlari, setLocalUremeAyarlari] = useState(uremeAyarlari);

  const handleSaveUremeAyarlari = () => {
    setUremeAyarlari(localUremeAyarlari);
    alert('Üreme ve Uyarı ayarları başarıyla kaydedildi.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };


  const handleDeleteAll = async () => {
    if (window.confirm("DİKKAT: Tarayıcınızdaki tüm sürü verileri kalıcı olarak silinecektir. İşlemi onaylıyor musunuz?")) {
      const { db } = await import('../lib/db');
      try {
        await Promise.all([
          db.hayvanlar.clear(),
          db.gruplar.clear(),
          db.yemler.clear(),
          db.yemHareketleri.clear(),
          db.sutKayitlari.clear(),
          db.agirlikKayitlari.clear(),
          db.saglikOlaylari.clear(),
          db.asiProtokolleri.clear(),
          db.planlananAsilar.clear(),
          db.uremeKayitlari.clear(),
          db.buzagiKayitlari.clear(),
          db.syncQueue.clear()
        ]);
        alert("Tüm veriler başarıyla silindi.");
        window.location.reload();
      } catch (err) {
        console.error("Veri silme hatası:", err);
        alert("Veriler silinirken bir hata oluştu.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-earth-900 tracking-tight">Ayarlar</h1>
          <p className="text-earth-500 font-medium mt-1">Veri yönetimi ve sistem tercihleri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Üreme ve Uyarı Ayarları */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6 md:col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900">Üreme ve Uyarı Ayarları</h2>
          </div>
          
          <p className="text-sm text-earth-600">
            İşletmenize veya hayvan ırkına özel döngü sürelerini buradan belirleyebilirsiniz.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Gebelik Süresi (Gün)</label>
              <input 
                type="number" 
                value={localUremeAyarlari.gebelikSuresi}
                onChange={e => setLocalUremeAyarlari({...localUremeAyarlari, gebelikSuresi: Number(e.target.value)})}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Kızgınlık Döngüsü (Gün)</label>
              <input 
                type="number" 
                value={localUremeAyarlari.kizginlikDongusu}
                onChange={e => setLocalUremeAyarlari({...localUremeAyarlari, kizginlikDongusu: Number(e.target.value)})}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Kuruya Çıkarma (Doğumdan X gün önce)</label>
              <input 
                type="number" 
                value={localUremeAyarlari.kuruyaCikarma}
                onChange={e => setLocalUremeAyarlari({...localUremeAyarlari, kuruyaCikarma: Number(e.target.value)})}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Yeniden Tohumlama (Doğumdan X gün sonra)</label>
              <input 
                type="number" 
                value={localUremeAyarlari.yenidenTohumlamaUyarisi}
                onChange={e => setLocalUremeAyarlari({...localUremeAyarlari, yenidenTohumlamaUyarisi: Number(e.target.value)})}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleSaveUremeAyarlari}
              className="flex items-center space-x-2 bg-nature-600 hover:bg-nature-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-sm"
            >
              <Save className="w-5 h-5" />
              <span>Ayarları Kaydet</span>
            </button>
          </div>
        </div>

        {/* Veri Yönetimi */}
        <div className="md:col-span-2">
          <DataManagement />
        </div>

        {/* Ekip Yönetimi (Gelecek) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900">Ekip Yönetimi</h2>
          </div>
          
          <p className="text-sm text-earth-600">Çiftliğinize gözlemci veya çalışan davet edin.</p>

          <Link to="/invite" 
            className="flex items-center justify-center space-x-2 w-full py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold hover:bg-purple-100 transition"
          >
            <ShieldAlert className="w-5 h-5" />
            <span>Yeni Üye Davet Et</span>
          </Link>
        </div>
        
        {/* Hesap Yönetimi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6 md:col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <LogOut className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900">Hesap Yönetimi</h2>
          </div>
          
          <p className="text-sm text-earth-600">Sistemden güvenli bir şekilde çıkış yapın.</p>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 w-full md:w-auto px-6 py-3 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl font-bold hover:bg-orange-100 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Sistemden Çıkış Yap</span>
          </button>
        </div>

        {/* Tehlikeli Alan */}
        <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-200 space-y-6 md:col-span-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-red-900">Tehlikeli Alan</h2>
          </div>
          
          <p className="text-sm text-red-700">Tüm cihazdaki (tarayıcı) verilerinizi kalıcı olarak siler. Bu işlem geri alınamaz.</p>

          <button 
            onClick={handleDeleteAll}
            className="flex items-center justify-center space-x-2 w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm"
          >
            <Trash2 className="w-5 h-5" />
            <span>Tüm Verileri Sil</span>
          </button>
        </div>
      </div>


    </div>
  );
};

export default Settings;
