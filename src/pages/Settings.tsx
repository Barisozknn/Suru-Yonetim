import React, { useState, useRef } from 'react';
import DataManagement from '../components/DataManagement';
import { Trash2, LogOut, CalendarClock, Save, CloudOff, UserX, LogIn, User, Download, Upload, Moon, Sun, Bell, MapPin, LocateFixed, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, checkPushSubscription } from '../utils/pushUtils';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { STANDART_IRKLAR } from '../components/AnimalForm';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, uremeAyarlari, setUremeAyarlari, theme, setTheme, sutLitreFiyati, setSutLitreFiyati, buzagiFiyati, setBuzagiFiyati, canliKiloFiyatlari, setCanliKiloFiyatlari, isletmeTipi, setIsletmeTipi, konum, setKonum, isAiUnlocked, setIsAiUnlocked } = useStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUremeAyarlari, setLocalUremeAyarlari] = useState(uremeAyarlari);
  const [localSutFiyati, setLocalSutFiyati] = useState(sutLitreFiyati.toString());
  const [localBuzagiFiyati, setLocalBuzagiFiyati] = useState(buzagiFiyati.toString());
  const [localCanliKiloFiyatlari, setLocalCanliKiloFiyatlari] = useState<Record<string, string>>({
    'Dana': canliKiloFiyatlari?.['Dana']?.toString() || '300',
    'Düve': canliKiloFiyatlari?.['Düve']?.toString() || '300',
    'İnek': canliKiloFiyatlari?.['İnek']?.toString() || '300',
    'Tosun': canliKiloFiyatlari?.['Tosun']?.toString() || '300',
    'Boğa': canliKiloFiyatlari?.['Boğa']?.toString() || '300',
    'Öküz': canliKiloFiyatlari?.['Öküz']?.toString() || '300',
  });
  const [localIsletmeTipi, setLocalIsletmeTipi] = useState<'Süt' | 'Besi' | 'Karma'>(isletmeTipi || 'Karma');
  const [selectedIrk, setSelectedIrk] = useState<string>('Varsayılan');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(true);
  const [konumLoading, setKonumLoading] = useState(false);
  const [konumError, setKonumError] = useState<string | null>(null);
  const [aiCode, setAiCode] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  React.useEffect(() => {
    checkPushSubscription().then(sub => {
      setIsSubscribed(sub);
      setPushLoading(false);
    });
  }, []);

  const handlePushToggle = async () => {
    setPushLoading(true);
    if (isSubscribed) {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
    } else {
      try {
        await subscribeToPushNotifications();
        setIsSubscribed(true);
      } catch (err: any) {
        alert('Bildirim izni alınamadı: ' + err.message);
      }
    }
    setPushLoading(false);
  };

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

  const handleExportJSON = async () => {
    try {
      const { db } = await import('../lib/db');
      const allData = {
        ciftlikler: await db.ciftlikler.toArray(),
        hayvanlar: await db.hayvanlar.toArray(),
        gruplar: await db.gruplar.toArray(),
        yemler: await db.yemler.toArray(),
        yemHareketleri: await db.yemHareketleri.toArray(),
        sutKayitlari: await db.sutKayitlari.toArray(),
        agirlikKayitlari: await db.agirlikKayitlari.toArray(),
        saglikOlaylari: await db.saglikOlaylari.toArray(),
        asiProtokolleri: await db.asiProtokolleri.toArray(),
        planlananAsilar: await db.planlananAsilar.toArray(),
        uremeKayitlari: await db.uremeKayitlari.toArray(),
        buzagiKayitlari: await db.buzagiKayitlari.toArray(),
        sohbetler: await db.table('sohbetler').toArray(),
        ekFinansalIslemler: await db.ekFinansalIslemler.toArray(),
        gunlukYemMaliyetleri: await db.gunlukYemMaliyetleri.toArray(),
        settings: useStore.getState().uremeAyarlari,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `surumetri_yedek_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error("Dışa aktarma hatası:", err);
      alert("Veriler dışa aktarılırken bir hata oluştu.");
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!window.confirm("DİKKAT: Yüklediğiniz dosyadaki veriler, mevcut verilerinizin üzerine yazılacaktır! (Aynı ID'li kayıtlar güncellenir, diğerleri eklenir). Devam etmek istiyor musunuz?")) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const { db } = await import('../lib/db');
      
      const tables = [
        'ciftlikler', 'hayvanlar', 'gruplar', 'yemler', 'yemHareketleri',
        'sutKayitlari', 'agirlikKayitlari', 'saglikOlaylari', 'asiProtokolleri',
        'planlananAsilar', 'uremeKayitlari', 'buzagiKayitlari', 'sohbetler', 
        'ekFinansalIslemler', 'gunlukYemMaliyetleri'
      ];

      for (const table of tables) {
        if (data[table] && Array.isArray(data[table])) {
           await db.table(table).bulkPut(data[table]);
           
           for (const item of data[table]) {
              await db.syncQueue.put({
                table,
                action: 'UPDATE',
                payload: item,
                created_at: Date.now()
              });
           }
        }
      }

      if (data.settings) {
         useStore.getState().setUremeAyarlari(data.settings);
      }

      alert("Tüm veriler başarıyla yüklendi! Yeni verilerin aktifleşmesi için sayfa yenileniyor...");
      window.location.reload();
      
    } catch (err) {
      console.error("İçe aktarma hatası:", err);
      alert("Geçersiz JSON dosya formatı veya yükleme hatası.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveUremeAyarlari = async () => {
    setUremeAyarlari(localUremeAyarlari);
    alert('Üreme ve Uyarı ayarları başarıyla kaydedildi.');
  };

  const handleKonumBul = () => {
    if (!navigator.geolocation) {
      setKonumError('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }
    setKonumLoading(true);
    setKonumError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr`,
            { headers: { 'User-Agent': 'SuruYonetimApp/1.0' } }
          );
          const geo = await res.json();
          const sehir =
            geo.address?.city ||
            geo.address?.town ||
            geo.address?.village ||
            geo.address?.county ||
            'Bilinmeyen Konum';
          setKonum({ lat, lon, sehir });
        } catch {
          setKonum({ lat, lon, sehir: 'Konumunuz' });
        }
        setKonumLoading(false);
      },
      (err) => {
        const mesaj =
          err.code === 1
            ? 'Konum izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.'
            : err.code === 2
            ? 'Konum bilgisi alınamadı. GPS sinyali zayıf olabilir.'
            : 'Konum alınırken zaman aşımı oluştu.';
        setKonumError(mesaj);
        setKonumLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSaveEkonomikAyarlar = () => {
    const valSut = parseFloat(localSutFiyati);
    const valBuzagi = parseFloat(localBuzagiFiyati);
    
    let pricesValid = true;
    const parsedPrices: Record<string, number> = {};
    for (const [tur, val] of Object.entries(localCanliKiloFiyatlari)) {
      const numVal = parseFloat(val);
      if (isNaN(numVal) || numVal < 0) {
        pricesValid = false;
        break;
      }
      parsedPrices[tur] = numVal;
    }

    if (!isNaN(valSut) && valSut >= 0 && !isNaN(valBuzagi) && valBuzagi >= 0 && pricesValid) {
      setSutLitreFiyati(valSut);
      setBuzagiFiyati(valBuzagi);
      setCanliKiloFiyatlari(parsedPrices);
      setIsletmeTipi(localIsletmeTipi);
      alert('İşletme ve Ekonomik ayarlar başarıyla kaydedildi.');
    } else {
      alert('Lütfen tüm alanlara geçerli fiyatlar giriniz.');
    }
  };

  const handleLogout = async () => {
    useStore.getState().setIsGuest(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleActivateAi = async () => {
    if (!aiCode) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_ai_activation', { activation_code: aiCode });
      if (error) {
        alert('Doğrulama sırasında bir hata oluştu: ' + error.message);
      } else if (data === true) {
        setIsAiUnlocked(true);
        alert('AI Asistan ve Gelişmiş Analizler başarıyla aktif edildi.');
        setAiCode('');
      } else {
        alert('Geçersiz aktivasyon kodu.');
      }
    } catch (err: any) {
      alert('Sistem hatası: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };


  const handleDeleteAll = async () => {
    if (window.confirm("DİKKAT: Tarayıcınızdaki tüm sürü verileri kalıcı olarak silinecektir. İşlemi onaylıyor musunuz?")) {
      const { db } = await import('../lib/db');
      try {
        await Promise.all([
          db.ciftlikler.clear(),
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
          'uremeKayitlari', 'buzagiKayitlari', 'sohbetler', 'ekFinansalIslemler', 'gunlukYemMaliyetleri', 'ciftlikler'
        ];
        
        for (const table of tables) {
          await supabase.from(table).delete().not('id', 'is', null);
        }
        
        // Yerel verileri temizle
        const { db } = await import('../lib/db');
        await Promise.all([
          db.ciftlikler.clear(),
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
        // sessionStorage.clear() ve localStorage.clear() kaldırıldı, çünkü auth token ve diğer yerel state'lerin kalması gerekiyor
        
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
          db.ciftlikler.clear(),
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
        useStore.getState().setIsGuest(false);
        
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
          <h1 className="text-3xl font-black text-earth-900 dark:text-gray-100 tracking-tight">Ayarlar</h1>
          <p className="text-earth-500 dark:text-gray-400 font-medium mt-1">Veri yönetimi ve sistem tercihleri</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Üreme ve Uyarı Ayarları */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">Üreme ve Uyarı Ayarları</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <p className="text-sm text-earth-600 dark:text-gray-400">
              İşletmenize veya hayvan ırkına özel döngü sürelerini buradan belirleyebilirsiniz.
            </p>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-bold text-earth-700 dark:text-gray-300 whitespace-nowrap">Irk Seçimi:</label>
              <select 
                value={selectedIrk}
                onChange={(e) => setSelectedIrk(e.target.value)}
                className="p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-700 text-earth-900 dark:text-white"
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
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Gebelik Süresi (Gün)</label>
              <input 
                type="number" 
                value={currentValues.gebelikSuresi}
                onChange={e => updateCurrentValues('gebelikSuresi', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Kızgınlık Döngüsü (Gün)</label>
              <input 
                type="number" 
                value={currentValues.kizginlikDongusu}
                onChange={e => updateCurrentValues('kizginlikDongusu', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Kuruya Çıkarma (Doğumdan X gün önce)</label>
              <input 
                type="number" 
                value={currentValues.kuruyaCikarma}
                onChange={e => updateCurrentValues('kuruyaCikarma', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Yeniden Tohumlama (Doğumdan X gün sonra)</label>
              <input 
                type="number" 
                value={currentValues.yenidenTohumlamaUyarisi}
                onChange={e => updateCurrentValues('yenidenTohumlamaUyarisi', Number(e.target.value))}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
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

        {/* Ekonomik Ayarlar */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <span className="font-black text-xl">₺</span>
            </div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">İşletme ve Ekonomik Ayarlar</h2>
          </div>
          
          <p className="text-sm text-earth-600 dark:text-gray-400">
            İşletme tipini ve finansal hesaplamalar için kullanılacak temel fiyatlandırmaları belirleyin. İşletme tipi SürüMetri panosunu şekillendirir.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">İşletme Tipi</label>
              <select 
                value={localIsletmeTipi}
                onChange={e => setLocalIsletmeTipi(e.target.value as 'Süt' | 'Besi' | 'Karma')}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none font-bold"
              >
                <option value="Süt">Süt İşletmesi</option>
                <option value="Besi">Besi İşletmesi</option>
                <option value="Karma">Karma İşletme</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Süt Litre Fiyatı (₺)</label>
              <input 
                type="number" 
                step="0.1"
                value={localSutFiyati}
                onChange={e => setLocalSutFiyati(e.target.value)}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Varsayılan Buzağı Fiyatı (₺)</label>
              <input 
                type="number" 
                step="100"
                value={localBuzagiFiyati}
                onChange={e => setLocalBuzagiFiyati(e.target.value)}
                className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
              />
            </div>

            <div className="space-y-3 col-span-1 sm:col-span-2 lg:col-span-4 mt-2">
              <label className="text-xs font-bold text-earth-700 dark:text-gray-300">Türe Özel Canlı Kilo (Baskül) Fiyatları (₺)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.keys(localCanliKiloFiyatlari).map((tur) => (
                  <div key={tur} className="space-y-1">
                    <label className="text-[10px] font-bold text-earth-600 dark:text-gray-400 uppercase tracking-wider">{tur}</label>
                    <input 
                      type="number" 
                      step="1"
                      value={localCanliKiloFiyatlari[tur]}
                      onChange={e => setLocalCanliKiloFiyatlari({...localCanliKiloFiyatlari, [tur]: e.target.value})}
                      className="w-full p-2 border border-earth-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-nature-500 outline-none text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-full sm:w-auto">
              <button 
                onClick={handleSaveEkonomikAyarlar}
                className="w-full flex items-center justify-center space-x-2 bg-nature-600 hover:bg-nature-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-sm"
              >
                <Save className="w-5 h-5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Konum ve Hava Durumu */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-4 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded-lg">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">Konum ve Hava Durumu</h2>
          </div>

          <p className="text-sm text-earth-600 dark:text-gray-400">
            Anasayfada hava durumu gösterebilmek için konumunuzu bir kez belirlemeniz yeterli.
            Konum bilgisi cihazınızda kalıcı olarak saklanır, tekrar izin istenmez.
          </p>

          {konum ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-100 dark:bg-sky-900/40 rounded-xl text-sky-500">
                  <LocateFixed className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-sky-800 dark:text-sky-200">{konum.sehir}</p>
                  <p className="text-xs text-sky-600 dark:text-sky-400">
                    {konum.lat.toFixed(4)}°, {konum.lon.toFixed(4)}°
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleKonumBul}
                  disabled={konumLoading}
                  className="flex items-center gap-2 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-60"
                >
                  <LocateFixed className={`w-4 h-4 ${konumLoading ? 'animate-spin' : ''}`} />
                  {konumLoading ? 'Bulunuyor…' : 'Güncelle'}
                </button>
                <button
                  onClick={() => { setKonum(null); setKonumError(null); }}
                  className="flex items-center gap-2 text-sm font-bold border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                  Konumu Sil
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                onClick={handleKonumBul}
                disabled={konumLoading}
                className="flex items-center gap-2 font-bold bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-xl transition shadow-sm disabled:opacity-60"
              >
                <LocateFixed className={`w-5 h-5 ${konumLoading ? 'animate-spin' : ''}`} />
                {konumLoading ? 'Konum Bulunuyor…' : 'Konumumu Bul'}
              </button>
              {!konumLoading && (
                <p className="text-xs text-earth-500 dark:text-gray-400">
                  Tarayıcınız konum izni isteyecektir.
                </p>
              )}
            </div>
          )}

          {konumError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
              {konumError}
            </p>
          )}
        </div>

        {/* Görünüm Ayarları */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
              <Moon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">Görünüm Ayarları</h2>
          </div>
          
          <p className="text-sm text-earth-600 dark:text-gray-400">
            Uygulamanın arayüz temasını buradan değiştirebilirsiniz.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button 
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'light' 
                  ? 'border-nature-500 bg-nature-50 text-nature-700 dark:bg-nature-900/30 dark:border-nature-400 dark:text-nature-400' 
                  : 'border-earth-200 dark:border-gray-700 text-earth-600 dark:text-gray-400 hover:bg-earth-50 dark:hover:bg-gray-700'
              }`}
            >
              <Sun className="w-6 h-6" />
              <span className="font-bold">Aydınlık Mod</span>
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                theme === 'dark' 
                  ? 'border-nature-500 bg-nature-50 text-nature-700 dark:bg-nature-900/30 dark:border-nature-400 dark:text-nature-400' 
                  : 'border-earth-200 dark:border-gray-700 text-earth-600 dark:text-gray-400 hover:bg-earth-50 dark:hover:bg-gray-700'
              }`}
            >
              <Moon className="w-6 h-6" />
              <span className="font-bold">Karanlık Mod</span>
            </button>
          </div>
        </div>

        {/* Bildirim Ayarları */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-lg">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">Bildirim Ayarları</h2>
          </div>
          
          <p className="text-sm text-earth-600 dark:text-gray-400">
            Uygulama kapalıyken bile yaklaşan görevler ve acil uyarılar hakkında bildirim alabilirsiniz.
          </p>

          <div className="flex items-center justify-between p-4 border border-earth-200 dark:border-gray-700 rounded-xl">
            <div>
              <h4 className="font-bold text-earth-900 dark:text-gray-100">Anlık Bildirimler (Push)</h4>
              <p className="text-xs text-earth-500 dark:text-gray-400 mt-1">Sistem uyarılarını cihazınıza gönderir.</p>
              {useStore.getState().isGuest && (
                <p className="text-xs font-bold text-orange-500 mt-2">Bu özelliği kullanmak için giriş yapmalısınız.</p>
              )}
            </div>
            <button 
              onClick={handlePushToggle}
              disabled={pushLoading || useStore.getState().isGuest}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isSubscribed ? 'bg-nature-500' : 'bg-gray-300 dark:bg-gray-600'} ${(pushLoading || useStore.getState().isGuest) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSubscribed ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* AI Asistan Aktivasyonu */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-800/30 space-y-4 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">AI Asistan Aktivasyonu</h2>
          </div>
          
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Yapay zeka destekli çiftlik analizleri ve sohbet asistanını kullanmak için aktivasyon kodunuzu girin.
          </p>

          {isAiUnlocked ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">AI Asistan ve Gelişmiş Analizler Aktif</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Aktivasyon Kodunu Girin" 
                value={aiCode}
                onChange={(e) => setAiCode(e.target.value)}
                className="flex-1 p-3 border-2 border-indigo-200 dark:border-indigo-700/50 bg-white dark:bg-gray-800 text-earth-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button 
                onClick={handleActivateAi}
                disabled={aiLoading || !aiCode}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition shadow-sm"
              >
                {aiLoading ? (
                  <span>Doğrulanıyor...</span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Aktive Et</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Veri Yönetimi */}
        <div className="md:col-span-2">
          <DataManagement />
        </div>
        
        {/* Hesap Yönetimi */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-2 rounded-lg ${useStore.getState().isGuest ? 'bg-nature-100 text-nature-600' : 'bg-orange-100 text-orange-600'}`}>
              {useStore.getState().isGuest ? <User className="w-6 h-6" /> : <LogOut className="w-6 h-6" />}
            </div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">Hesap Yönetimi</h2>
          </div>
          
          <p className="text-sm text-earth-600 dark:text-gray-400">
            {useStore.getState().isGuest 
              ? 'Verilerinizi buluta yedeklemek ve cihazlar arası eşitlemek için bir hesaba giriş yapın.' 
              : 'Sistemden güvenli bir şekilde çıkış yapın.'}
          </p>

          <button 
            onClick={handleLogout}
            className={`flex items-center justify-center space-x-2 w-full md:w-auto px-6 py-3 border rounded-xl font-bold transition ${
              useStore.getState().isGuest
                ? 'bg-nature-50 dark:bg-nature-900/20 text-nature-700 dark:text-nature-400 border-nature-200 dark:border-nature-800 hover:bg-nature-100 dark:hover:bg-nature-900/40'
                : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40'
            }`}
          >
            {useStore.getState().isGuest ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
            <span>{useStore.getState().isGuest ? 'Hesaba Giriş Yap' : 'Hesaptan Çıkış Yap'}</span>
          </button>
        </div>

        {/* JSON Yedekleme */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-800/50 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Download className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300">Tam Yedekleme (JSON)</h2>
          </div>
          
          <p className="text-sm text-indigo-700 dark:text-indigo-400">
            Sistemdeki tüm verilerinizi (Çiftlikler, Hayvanlar, Ayarlar vb.) tek bir JSON dosyası olarak cihazınıza indirebilir ve başka bir cihazda geri yükleyebilirsiniz.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button 
              onClick={handleExportJSON}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm"
            >
              <Download className="w-5 h-5" />
              <span>Verileri İndir (.json)</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto px-6 py-3 border-2 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-transparent rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition shadow-sm"
            >
              <Upload className="w-5 h-5" />
              <span>Verileri Yükle</span>
            </button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImportJSON}
            />
          </div>
        </div>

        {/* Tehlikeli Alan */}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl shadow-sm border border-red-200 dark:border-red-800/50 space-y-6 md:col-span-2 transition-colors">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-red-900 dark:text-red-400">Tehlikeli Alan</h2>
          </div>
          
          <p className="text-sm text-red-700 dark:text-red-400">Dikkat: Bu alandaki işlemler geri alınamaz verilerinizin silinmesine yol açar.</p>

          <div className="space-y-4 pt-2">
            {(useStore.getState().isGuest || !user) && (
              <button 
                onClick={handleDeleteAll}
                className="flex items-center justify-center space-x-2 w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm"
              >
                <Trash2 className="w-5 h-5" />
                <span>Tüm Tarayıcı Verilerini Sil</span>
              </button>
            )}

            {(!useStore.getState().isGuest && user) && (
              <>
                <button 
                  onClick={handleDeleteCloudData}
                  className="flex items-center justify-center space-x-2 w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-sm"
                >
                  <CloudOff className="w-5 h-5" />
                  <span>Bulut Verilerimi Sil (Hesap Açık Kalır)</span>
                </button>
                
                <div className="pt-4 mt-4 border-t border-red-200">
                  <p className="text-sm text-red-700 dark:text-red-400 font-bold mb-3 flex items-center"><UserX className="w-4 h-4 mr-2"/> Hesabı Tamamen Kapat</p>
                  <button 
                    onClick={handleDeleteAccount}
                    className="flex items-center justify-center space-x-2 w-full py-3 border-2 border-red-600 dark:border-red-500 text-red-700 dark:text-red-400 rounded-xl font-bold hover:bg-red-600 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition shadow-sm"
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
