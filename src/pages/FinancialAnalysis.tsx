import React, { useState, useMemo } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { Wallet, TrendingUp, TrendingDown, Plus, Filter, Info, Settings2 } from 'lucide-react';
import FinancialTransactionModal from '../components/FinancialTransactionModal';
import { calculateTotalDailyFeedCost } from '../utils/dashboardCalculations';

const FinancialAnalysis: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { sutLitreFiyati, setSutLitreFiyati } = useStore();
  const [localSutFiyati, setLocalSutFiyati] = useState(sutLitreFiyati.toString());
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'this_month' | 'last_7_days' | 'this_year'>('last_7_days');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const saglikOlaylari = useLiveFarmQuery(() => db.saglikOlaylari.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];
  const yemHareketleri = useLiveFarmQuery(() => db.yemHareketleri.toArray()) || [];
  const yemler = useLiveFarmQuery(() => db.yemler.toArray()) || [];
  const ekFinansalIslemler = useLiveFarmQuery(() => db.ekFinansalIslemler.toArray()) || [];
  const gunlukYemMaliyetleri = useLiveFarmQuery(() => db.gunlukYemMaliyetleri.toArray()) || [];
  const planlananAsilar = useLiveFarmQuery(() => db.planlananAsilar.toArray()) || [];

  const handleSutFiyatiUpdate = () => {
    const val = parseFloat(localSutFiyati);
    if (!isNaN(val) && val > 0) {
      setSutLitreFiyati(val);
    }
  };

  const calculations = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    let targetDate = new Date(0); // all time
    
    if (timeFilter === 'last_7_days') {
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - 7);
      targetDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'this_month') {
      targetDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeFilter === 'this_year') {
      targetDate = new Date(now.getFullYear(), 0, 1);
    }

    const isInRange = (dateStr: string | undefined) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= targetDate && d <= now;
    };

    // Grup filtrelemesi (Hayvan ID'lerini bul)
    let targetHayvanIds: Set<string> | null = null;
    if (groupFilter !== 'all') {
      const gHayvanlar = hayvanlar.filter(h => h.grupId === groupFilter).map(h => h.id);
      targetHayvanIds = new Set(gHayvanlar);
    }
    
    const isAnimalInGroup = (hayvanId: string) => {
      if (targetHayvanIds === null) return true; // all groups
      return targetHayvanIds.has(hayvanId);
    };

    // 1. Süt Geliri
    const filteredSut = sutKayitlari.filter(k => isInRange(k.tarih) && isAnimalInGroup(k.hayvanId));
    const toplamLitre = filteredSut.reduce((acc, curr) => acc + curr.litre, 0);
    const sutGeliri = toplamLitre * sutLitreFiyati;

    // 2. Hayvan Satış Geliri
    const filteredSatis = hayvanlar.filter(h => h.durum === 'Satıldı' && isInRange(h.satisTarihi) && isAnimalInGroup(h.id));
    const hayvanSatisGeliri = filteredSatis.reduce((acc, curr) => acc + (curr.satisFiyati || 0), 0);

    // 3. Sağlık Gideri
    const filteredSaglik = saglikOlaylari.filter(s => isInRange(s.tarih) && isAnimalInGroup(s.hayvanId));
    let saglikGideri = filteredSaglik.reduce((acc, curr) => acc + (curr.maliyet || 0), 0);

    // Yapılmış aşıların maliyetlerini sağlık giderine ekle
    const filteredAsilar = planlananAsilar.filter(a => a.yapildiMi && isInRange(a.yapilmaTarihi) && isAnimalInGroup(a.hayvanId));
    saglikGideri += filteredAsilar.reduce((acc, curr) => acc + (curr.maliyet || 0), 0);

    // 4. Üreme Gideri
    const filteredUreme = uremeKayitlari.filter(u => isInRange(u.tarih) && isAnimalInGroup(u.hayvanId));
    const uremeGideri = filteredUreme.reduce((acc, curr) => acc + (curr.maliyet || 0), 0);

    // 5. Yem Gideri (Günlük Kayıtlar Üzerinden)
    // Not: Grup filtresi geçmişteki yem maliyeti genel kaydedildiği için şu an tüm sürüyü kapsar.
    const todayStr = new Date().toISOString().split('T')[0];
    const filteredYemMaliyetleri = gunlukYemMaliyetleri.filter(y => isInRange(y.tarih) && y.tarih !== todayStr);
    const pastYemGideri = filteredYemMaliyetleri.reduce((acc, curr) => acc + curr.toplamMaliyet, 0);
    
    let todayYemGideri = 0;
    if (isInRange(todayStr)) {
      todayYemGideri = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
    }
    const yemGideri = pastYemGideri + todayYemGideri;

    // 6. Ek Gelir / Giderler (Grup filtresi bunlara etki etmez, geneldir)
    const filteredEk = ekFinansalIslemler.filter(e => isInRange(e.tarih));
    const ekGelir = filteredEk.filter(e => e.tip === 'Gelir').reduce((acc, curr) => acc + curr.miktar, 0);
    const ekGider = filteredEk.filter(e => e.tip === 'Gider').reduce((acc, curr) => acc + curr.miktar, 0);

    const toplamGelir = sutGeliri + hayvanSatisGeliri + ekGelir;
    const toplamGider = saglikGideri + uremeGideri + yemGideri + ekGider;
    const netKar = toplamGelir - toplamGider;

    return {
      toplamLitre,
      sutGeliri,
      hayvanSatisGeliri,
      ekGelir,
      saglikGideri,
      uremeGideri,
      yemGideri,
      ekGider,
      toplamGelir,
      toplamGider,
      netKar,
      ekList: filteredEk.sort((a,b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
    };
  }, [
    hayvanlar, sutKayitlari, saglikOlaylari, uremeKayitlari, 
    yemHareketleri, yemler, ekFinansalIslemler, gunlukYemMaliyetleri,
    planlananAsilar, timeFilter, groupFilter, sutLitreFiyati
  ]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-earth-900 dark:text-gray-100 flex items-center space-x-3">
            <Wallet className="w-8 h-8 text-nature-600 dark:text-nature-400" />
            <span>Gelir Gider Analizi</span>
          </h1>
          <p className="text-earth-500 dark:text-gray-400 font-medium mt-1">İşletmenizin finansal durumunu detaylı inceleyin</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-nature-600 hover:bg-nature-700 text-white px-4 py-2 rounded-xl font-bold transition shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Ek Gelir / Gider Ekle</span>
        </button>
      </div>

      {/* Filters & Settings */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase flex items-center space-x-1">
            <Filter className="w-4 h-4" />
            <span>Sürü Grubu</span>
          </label>
          <select 
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 font-medium"
          >
            <option value="all">Tüm Sürü</option>
            {gruplar.map(g => (
              <option key={g.id} value={g.id}>{g.ad}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase flex items-center space-x-1">
            <Filter className="w-4 h-4" />
            <span>Zaman Aralığı</span>
          </label>
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 font-medium"
          >
            <option value="last_7_days">Son 7 Gün</option>
            <option value="this_month">Bu Ay</option>
            <option value="this_year">Bu Yıl</option>
            <option value="all">Tüm Zamanlar</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase flex items-center space-x-1">
            <Settings2 className="w-4 h-4" />
            <span>Süt Litre Fiyatı (₺)</span>
          </label>
          <div className="flex space-x-2">
            <input 
              type="number" 
              step="0.1"
              value={localSutFiyati}
              onChange={(e) => setLocalSutFiyati(e.target.value)}
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 font-medium"
            />
            <button 
              onClick={handleSutFiyatiUpdate}
              className="px-3 bg-earth-100 dark:bg-gray-800 hover:bg-earth-200 text-earth-700 dark:text-gray-300 font-bold rounded-lg transition whitespace-nowrap"
            >
              Uygula
            </button>
          </div>
        </div>
      </div>

      {groupFilter !== 'all' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 p-3 rounded-xl flex items-start space-x-2 text-blue-800 text-sm">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p><strong>Not:</strong> Belirli bir grup seçildiğinde Süt, Sağlık, Üreme ve Satış verileri filtrelenir. Yem Tüketimi ve Ek Finansal işlemler sürü geneli olarak hesaplamaya dahil edilir.</p>
        </div>
      )}

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col justify-center">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-earth-700 dark:text-gray-300">Toplam Gelir</h3>
          </div>
          <p className="text-3xl font-black text-green-600">{formatMoney(calculations.toplamGelir)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col justify-center">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-earth-700 dark:text-gray-300">Toplam Gider</h3>
          </div>
          <p className="text-3xl font-black text-red-600">{formatMoney(calculations.toplamGider)}</p>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center ${calculations.netKar >= 0 ? 'bg-nature-600 border-nature-700 text-white' : 'bg-red-600 border-red-700 text-white'}`}>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold opacity-90">Net Kar / Zarar</h3>
          </div>
          <p className="text-4xl font-black">{formatMoney(calculations.netKar)}</p>
        </div>
      </div>

      {/* Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gelir Kalemleri */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-4 bg-earth-50 dark:bg-gray-900 border-b border-earth-200 dark:border-gray-700">
            <h3 className="font-bold text-earth-800 dark:text-gray-200 text-lg">Gelir Kalemleri Detayı</h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl border border-green-100">
              <div>
                <p className="font-bold text-earth-800 dark:text-gray-200">Süt Satışı</p>
                <p className="text-xs text-earth-500 dark:text-gray-400">Toplam {calculations.toplamLitre.toFixed(1)} Lt (x {sutLitreFiyati}₺)</p>
              </div>
              <p className="font-black text-green-600">{formatMoney(calculations.sutGeliri)}</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl border border-green-100">
              <div>
                <p className="font-bold text-earth-800 dark:text-gray-200">Hayvan Satışı</p>
                <p className="text-xs text-earth-500 dark:text-gray-400">Formdan satıldı işaretlenenler</p>
              </div>
              <p className="font-black text-green-600">{formatMoney(calculations.hayvanSatisGeliri)}</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl border border-green-100">
              <div>
                <p className="font-bold text-earth-800 dark:text-gray-200">Ek Gelirler</p>
                <p className="text-xs text-earth-500 dark:text-gray-400">Manuel eklenen gelirler</p>
              </div>
              <p className="font-black text-green-600">{formatMoney(calculations.ekGelir)}</p>
            </div>
          </div>
        </div>

        {/* Gider Kalemleri */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-4 bg-earth-50 dark:bg-gray-900 border-b border-earth-200 dark:border-gray-700">
            <h3 className="font-bold text-earth-800 dark:text-gray-200 text-lg">Gider Kalemleri Detayı</h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100">
              <div>
                <h4 className="font-bold text-earth-800 dark:text-gray-200">Yem Maliyeti</h4>
                <p className="text-xs text-earth-400">Günlük olarak kaydedilen geçmiş maliyetler</p>
              </div>
              <p className="font-black text-red-600">-{formatMoney(calculations.yemGideri)}</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100">
              <div>
                <p className="font-bold text-earth-800 dark:text-gray-200">Sağlık Giderleri</p>
                <p className="text-xs text-earth-500 dark:text-gray-400">İlaç, aşı ve müdahale masrafları</p>
              </div>
              <p className="font-black text-red-600">-{formatMoney(calculations.saglikGideri)}</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100">
              <div>
                <p className="font-bold text-earth-800 dark:text-gray-200">Üreme Giderleri</p>
                <p className="text-xs text-earth-500 dark:text-gray-400">Tohumlama vb. masraflar</p>
              </div>
              <p className="font-black text-red-600">-{formatMoney(calculations.uremeGideri)}</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50/50 rounded-xl border border-red-100">
              <div>
                <p className="font-bold text-earth-800 dark:text-gray-200">Ek Giderler</p>
                <p className="text-xs text-earth-500 dark:text-gray-400">Manuel eklenen giderler</p>
              </div>
              <p className="font-black text-red-600">-{formatMoney(calculations.ekGider)}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Ek Finansal İşlemler Geçmişi */}
      {calculations.ekList.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 bg-earth-50 dark:bg-gray-900 border-b border-earth-200 dark:border-gray-700">
            <h3 className="font-bold text-earth-800 dark:text-gray-200">Ek Gelir ve Gider Geçmişi</h3>
          </div>
          <div className="divide-y divide-earth-100">
            {calculations.ekList.map(islem => (
              <div key={islem.id} className="p-4 flex items-center justify-between hover:bg-earth-50 dark:hover:bg-gray-700 transition">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${islem.tip === 'Gelir' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {islem.kategori}
                    </span>
                    <span className="text-sm font-medium text-earth-500 dark:text-gray-400">{new Date(islem.tarih).toLocaleDateString('tr-TR')}</span>
                  </div>
                  {islem.aciklama && <p className="text-earth-700 dark:text-gray-300 mt-1">{islem.aciklama}</p>}
                </div>
                <div className={`font-black ${islem.tip === 'Gelir' ? 'text-green-600' : 'text-red-600'}`}>
                  {islem.tip === 'Gelir' ? '+' : '-'}{formatMoney(islem.miktar)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <FinancialTransactionModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default FinancialAnalysis;
