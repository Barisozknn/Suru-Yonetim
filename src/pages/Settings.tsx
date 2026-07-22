import React, { useState } from 'react';
import DataManagement from '../components/DataManagement';
import { Trash2, LogOut, CalendarClock, Save, CloudOff, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { STANDART_IRKLAR } from '../components/AnimalForm';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, uremeAyarlari, setUremeAyarlari } = useStore();
  
  const [localUremeAyarlari, setLocalUremeAyarlari] = useState(uremeAyarlari);
  const [selectedIrk, setSelectedIrk] = useState<string>('Varsayılan');

  const currentValues = selectedIrk === 'Varsayılan' 
    ? localUremeAyarlari 
    : (localUremeAyarlari.irkAyarlari?.[selectedIrk] || localUremeAyarlari);

  const updateCurrentValues = (field: keyof typeof currentValues, value: number) => {
    if (selectedIrk === 'Varsayılan') {
      setLocalUremeAyarlari({ ...localUremeAyarlari, [field]: value });
    } else {
      const irkAyarlari = localUremeAyarlari.irkAyarlari || {};
      const irkMevcutAyar = irkAyarlari[selectedIrk] || {
        gebelikSuresi: localUremeAyarlari.gebelikSuresi,
        kizginlikDongusu: localUremeAyarlari.kizginlikDongusu,
        kuruyaCikarma: localUremeAyarlari.kuruyaCikarma,
        yenidenTohumlamaUyarisi: localUremeAyarlari.yenidenTohumlamaUyarisi
      };
      setLocalUremeAyarlari({
        ...localUremeAyarlari,
        irkAyarlari: {
          ...irkAyarlari,
          [selectedIrk]: { ...irkMevcutAyar, [field]: value }
        }
      });
    }
  };

  const handleSaveUremeAyarlari = () => {
    setUremeAyarlari(localUremeAyarlari);
    alert('Üreme ve Uyarı ayarları başarıyla kaydedildi.');
  };

  const handleLogout = async () => {
    useStore.getState().setIsGuest(false);
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
        
        localStorage.clear();
        sessionStorage.clear();
        
        alert("Tüm tarayıcı verileri başarıyla silindi.");
        window.location.reload();
      } catch (err) {
        console.error("Veri silme hatası:", err);
        alert("Veriler silinirken bir hata oluştu.");
      }
    }
  };

  const handleDeleteCloudData = async () => {
    if (!user) return;
    
    if (window.confirm("DİKKAT: Buluttaki ve bu cihazdaki tüm verileriniz SİLİNECEKTİR. Bu işlem GERİ ALINAMAZ. Onaylıyor musunuz?")) {
      try {
        const tables = [
          'hayvanlar', 'gruplar', 'yemler', 'yemHareketleri', 'sutKayitlari',
          'agirlikKayitlari', 'saglikOlaylari', 'asiProtokolleri', 'planlananAsilar',
          'uremeKayitlari', 'buzagiKayitlari', 'sohbetler', 'ekFinansalIslemler', 'gunlukYemMaliyetleri'
        ];
        
        for (const table of tables) {
          await supabase.from(table).delete().not('id', 'is', null);
        }
        
        // Yerel verileri temizle
        const { db } = await import('../lib/db');
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
        
        localStorage.clear();
        sessionStorage.clear();
        
        alert("Tüm verileriniz buluttan ve cihazdan (tarayıcıdan) başarıyla silindi.");
        window.location.reload();
      } catch (err) {
        console.error("Bulut verisi silme hatası:", err);
        alert("Bulut verileri silinirken bir hata oluştu.");
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (window.confirm("KRİTİK UYARI: Hesabınız ve hesabınıza bağlı TÜM verileriniz kalıcı olarak silinecektir. Bu işlem GERİ ALINAMAZ. Devam etmek istiyor musunuz?")) {
      try {
        // RPC fonksiyonu aracılığıyla hesabı sil
        const { error } = await supabase.rpc('delete_user');
        
        if (error) {
          console.error("Hesap silme hatası:", error);
          alert("Hesabınız silinirken bir hata oluştu. (Sistem yöneticisinin veritabanında 'delete_user' RPC'sini aktif ettiğinden emin olun).");
          return;
        }

        // Yerel verileri temizle
        const { db } = await import('../lib/db');
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
        
        localStorage.clear();
        sessionStorage.clear();
        
        await supabase.auth.signOut();
        navigate('/login');
      } catch (err) {
        console.error("Hesap silme hatası:", err);
        alert("Hesap silme işlemi başarısız oldu.");
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
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <p className="text-sm text-earth-600">
              İşletmenize veya hayvan ırkına özel döngü sürelerini buradan belirleyebilirsiniz.
            </p>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-bold text-earth-700 whitespace-nowrap">Irk Seçimi:</label>
              <select 
                value={selectedIrk}
                onChange={(e) => setSelectedIrk(e.target.value)}
                className="p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 bg-white"
              >
                <option value="Varsayılan">Varsayılan (Tüm Irklar)</option>
                <optgroup label="Özel Ayar Tanımlanabilecek Irklar">
                  {STANDART_IRKLAR.map(irk => (
                    <option key={irk} value={irk}>{irk}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Gebelik Süresi (Gün)</label>
              <input 
                type="number" 
                value={currentValues.gebelikSuresi}
                onChange={e => updateCurrentValues('gebelikSuresi', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Kızgınlık Döngüsü (Gün)</label>
              <input 
                type="number" 
                value={currentValues.kizginlikDongusu}
                onChange={e => updateCurrentValues('kizginlikDongusu', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Kuruya Çıkarma (Doğumdan X gün önce)</label>
              <input 
                type="number" 
                value={currentValues.kuruyaCikarma}
                onChange={e => updateCurrentValues('kuruyaCikarma', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700">Yeniden Tohumlama (Doğumdan X gün sonra)</label>
              <input 
                type="number" 
                value={currentValues.yenidenTohumlamaUyarisi}
                onChange={e => updateCurrentValues('yenidenTohumlamaUyarisi', Number(e.target.value))}
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
          
          <p className="text-sm text-red-700">Dikkat: Bu alandaki işlemler geri alınamaz verilerinizin silinmesine yol açar.</p>

          <div className="space-y-4 pt-2">
            {!user && (
              <button 
                onClick={handleDeleteAll}
                className="flex items-center justify-center space-x-2 w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm"
              >
                <Trash2 className="w-5 h-5" />
                <span>Tüm Tarayıcı Verilerini Sil</span>
              </button>
            )}

            {user && (
              <>
                <button 
                  onClick={handleDeleteCloudData}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm"
                >
                  <CloudOff className="w-5 h-5" />
                  <span>Bulut Verilerimi Sil (Hesap Açık Kalır)</span>
                </button>
                
                <div className="pt-4 mt-4 border-t border-red-200">
                  <p className="text-sm text-red-700 font-bold mb-3 flex items-center"><UserX className="w-4 h-4 mr-2"/> Hesabı Tamamen Kapat</p>
                  <button 
                    onClick={handleDeleteAccount}
                    className="flex items-center justify-center space-x-2 w-full py-3 border-2 border-red-600 text-red-700 rounded-xl font-bold hover:bg-red-600 hover:text-white transition shadow-sm"
                  >
                    <UserX className="w-5 h-5" />
                    <span>Hesabımı ve Tüm Verilerimi Sil</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default Settings;
