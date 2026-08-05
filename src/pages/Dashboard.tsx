import React, { useState, useEffect } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { 
  Users, Activity, AlertTriangle, TrendingDown, Heart,
  CalendarCheck, Syringe, Droplets, Plus, Trash2, CheckCircle2, Circle, Info, Bell
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CalfIcon } from '../components/icons/CalfIcon';
import { 
  calculateTotalAnimals, 
  calculateSpeciesDistribution, 
  calculateAverageMilkYield7Days, 
  getActiveHealthAlertsCount, 
  getExpectedBirths30DaysCount,
  getUpcomingBirths,
  calculateEstimatedFeedCostPerLiter,
  calculateTotalDailyFeedCost,
  getUpcomingHeatChecks,
  getUpcomingReInseminations,
  calculateHerdAveragePerformance
} from '../utils/dashboardCalculations';
import { Link } from 'react-router-dom';
import { SmartCalendar } from '../components/SmartCalendar';
import { useStore } from '../store/useStore';
import FarmSwitcher from '../components/FarmSwitcher';
import UyariPanel from '../components/UyariPanel';
import { useAnomalyDetection } from '../hooks/useAnomalyDetection';
import { calculate30DayProjection } from '../utils/financialProjection';
import { calculateHerdScore } from '../utils/herdScore';
import { Target, TrendingUp, BadgeDollarSign, HeartPulse } from 'lucide-react';
import { subscribeToPushNotifications } from '../utils/pushUtils';

const Dashboard: React.FC = () => {
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const asilar = useLiveFarmQuery(() => db.planlananAsilar.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];
  const yemler = useLiveFarmQuery(() => db.yemler.toArray()) || [];
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];
  const saglikOlaylari = useLiveFarmQuery(() => db.saglikOlaylari.toArray()) || [];
  const { uremeAyarlari, activeCiftlikId, sutLitreFiyati, isletmeTipi, canliKiloFiyati } = useStore();
  const anomalyUyarilar = useAnomalyDetection();
  const [pushStatus, setPushStatus] = useState<string>('');

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      await subscribeToPushNotifications();
      setPushStatus('granted');
      alert('Bildirim izni başarıyla verildi!');
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const rawTodos = useLiveFarmQuery(() => db.todos.orderBy('olusturulmaTarihi').reverse().toArray()) || [];
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todos = rawTodos.filter(todo => {
    if (!todo.yapildiMi) return true; // Tamamlanmamışları her zaman göster
    
    // Eğer bugün tamamlanmışsa göster
    if (todo.tamamlanmaTarihi && todo.tamamlanmaTarihi >= todayStart.getTime()) {
      return true;
    }
    
    // Eski tamamlanma tarihi olmayan ama bugün oluşturulup tamamlananları da göster (geriye dönük uyumluluk)
    if (!todo.tamamlanmaTarihi && todo.olusturulmaTarihi >= todayStart.getTime()) {
      return true;
    }
    
    // Önceki günlerde tamamlananları gizle
    return false;
  });

  todos.sort((a, b) => {
    if (a.yapildiMi !== b.yapildiMi) return a.yapildiMi ? 1 : -1; // Yapılanları alta at
    
    const priorityWeight = { 'Kritik': 3, 'Önemli': 2, 'Rutin': 1 };
    const wA = a.priority ? priorityWeight[a.priority as keyof typeof priorityWeight] || 0 : (a.isSystem ? 1 : 0);
    const wB = b.priority ? priorityWeight[b.priority as keyof typeof priorityWeight] || 0 : (b.isSystem ? 1 : 0);
    
    if (wA !== wB) return wB - wA; // Yüksek öncelikli üste
    
    // İkisi de aynıysa, eğer hedefTarih varsa hedefe yakın olan üste
    if (a.hedefTarih && b.hedefTarih) {
      return new Date(a.hedefTarih).getTime() - new Date(b.hedefTarih).getTime();
    }
    
    return b.olusturulmaTarihi - a.olusturulmaTarihi;
  });
  const [newTodo, setNewTodo] = useState('');
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [showProjInfo, setShowProjInfo] = useState(false);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const payload = {
      id: uuidv4(),
      ciftlikId: activeCiftlikId || 'default',
      metin: newTodo.trim(),
      yapildiMi: false,
      olusturulmaTarihi: Date.now()
    };
    await db.todos.add(payload);
    await db.syncQueue.add({ table: 'todos', action: 'INSERT', payload, created_at: Date.now() });
    setNewTodo('');
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    await db.todos.update(id, { 
      yapildiMi: !currentStatus,
      tamamlanmaTarihi: !currentStatus ? Date.now() : undefined
    });
  };

  const deleteTodo = async (id: string) => {
    await db.todos.delete(id);
  };

  const parseTodoText = (text: string) => {
    const parts = text.split(/(@[a-zA-ZçğıöşüÇĞİÖŞÜ]+\s*\d*|#[\wçğıöşüÇĞİÖŞÜ]+)/g);
    return parts.map((part, i) => {
      if (part.match(/^#[\wçğıöşüÇĞİÖŞÜ]+/)) {
        return <span key={i} className="text-nature-600 font-bold bg-nature-50 px-1 rounded-sm">{part}</span>;
      }
      if (part.match(/^@[a-zA-ZçğıöşüÇĞİÖŞÜ]+\s*\d*/)) {
        return <span key={i} className="text-blue-600 font-bold bg-blue-50 px-1 rounded-sm">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const totalAnimals = calculateTotalAnimals(hayvanlar);
  const speciesDist = calculateSpeciesDistribution(hayvanlar);
  const avgMilk = calculateAverageMilkYield7Days(sutKayitlari);
  const vaccineAlerts = getActiveHealthAlertsCount(asilar, hayvanlar);
  // Toplam uyarı = gecikmiş aşılar + anomali uyarıları
  const activeAlerts = vaccineAlerts + anomalyUyarilar.filter(u => u.siddet === 'KRITIK').length;
  const expectedBirths = getExpectedBirths30DaysCount(uremeKayitlari, hayvanlar);
  const heatChecks = getUpcomingHeatChecks(uremeKayitlari, hayvanlar);
  const reInseminations = getUpcomingReInseminations(uremeKayitlari, hayvanlar);

  const feedCost = calculateEstimatedFeedCostPerLiter(yemler, gruplar, sutKayitlari, hayvanlar);
  const totalFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
  const herdPerformance = calculateHerdAveragePerformance(hayvanlar, uremeKayitlari);

  const today = new Date();
  today.setHours(0,0,0,0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);

  const gecikmisAsilar = asilar.filter(a => !a.yapildiMi && new Date(a.planlanaTarih) < today).slice(0, 3);
  
  const yaklasanDogumlar = getUpcomingBirths(uremeKayitlari, hayvanlar, 30).slice(0, 3);

  const finProj = calculate30DayProjection(hayvanlar, sutKayitlari, uremeKayitlari, yemler, gruplar, saglikOlaylari, sutLitreFiyati, isletmeTipi, canliKiloFiyati);
  const herdScoreData = calculateHerdScore(hayvanlar, sutKayitlari, uremeKayitlari, yemler, gruplar, saglikOlaylari, sutLitreFiyati, isletmeTipi, canliKiloFiyati);

  return (
    <div className="w-full flex flex-col space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-earth-900 dark:text-gray-100 tracking-tight">Anasayfa</h1>
          <p className="text-earth-500 dark:text-gray-400 font-medium text-sm sm:text-base mt-0.5">Sürünüzün genel durum özeti</p>
        </div>
        <FarmSwitcher />
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex items-center space-x-4">
          <div className="p-4 bg-earth-100 dark:bg-gray-800 text-earth-600 dark:text-gray-400 rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase">Toplam Hayvan</p>
            <p className="text-3xl font-black text-earth-900 dark:text-gray-100">{totalAnimals}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase">İnek Başı Ort. Süt (Son 7 Gün)</p>
            <p className="text-3xl font-black text-earth-900 dark:text-gray-100">{avgMilk.toFixed(1)} <span className="text-base">Lt/Gün</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex items-center space-x-4">
          <div className={`p-4 rounded-xl ${activeAlerts > 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-green-100 text-green-600'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase">Sağlık / Aşı Uyarısı</p>
            <p className={`text-3xl font-black ${activeAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600'}`}>{activeAlerts}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex items-center space-x-4">
          <div className="p-4 bg-pink-100 text-pink-600 rounded-xl">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase">Yaklaşan Doğumlar</p>
            <p className="text-3xl font-black text-earth-900 dark:text-gray-100">{expectedBirths} <span className="text-base font-normal text-earth-500 dark:text-gray-400">(30 Gün)</span></p>
          </div>
        </div>
      </div>

      {/* Akıllı Anomali & Uyarı Paneli */}
      <UyariPanel uyarilar={anomalyUyarilar} />

      {/* SürüMetri Skoru & Finansal Projeksiyon */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SürüMetri Skoru */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between">
          <Target className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-indigo-100 flex items-center gap-2">
                <Target className="w-6 h-6" />
                SürüMetri Skoru
              </h3>
              <button 
                onClick={() => setShowScoreInfo(true)} 
                className="text-indigo-300 hover:text-white transition"
                title="SürüMetri Skoru Nedir?"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-indigo-200 mb-6">
              {isletmeTipi === 'Etçi' 
                ? 'İşletmenizin genel sağlık, büyüme ve yem verimliliği performansı' 
                : 'İşletmenizin genel sağlık, üreme ve verim performansı'}
            </p>
          </div>
          
          <div className="flex items-end justify-between">
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-black">{herdScoreData.totalScore}</span>
              <span className="text-xl font-medium text-indigo-300">/ 100</span>
            </div>
          </div>
          
          <div className={`grid ${isletmeTipi === 'Etçi' ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mt-6`}>
            <div className="bg-indigo-900/30 p-2 rounded-lg text-center">
              <p className="text-[10px] text-indigo-300 uppercase font-bold mb-1">{isletmeTipi === 'Etçi' ? 'Büyüme' : 'Süt'}</p>
              <p className="font-bold">{herdScoreData.breakdown.milkScore}/40</p>
            </div>
            {isletmeTipi === 'Sütçü' && (
              <div className="bg-indigo-900/30 p-2 rounded-lg text-center">
                <p className="text-[10px] text-indigo-300 uppercase font-bold mb-1">Üreme</p>
                <p className="font-bold">{herdScoreData.breakdown.reproductionScore}/30</p>
              </div>
            )}
            <div className="bg-indigo-900/30 p-2 rounded-lg text-center">
              <p className="text-[10px] text-indigo-300 uppercase font-bold mb-1">Sağlık</p>
              <p className="font-bold">{herdScoreData.breakdown.healthScore}/{isletmeTipi === 'Etçi' ? '30' : '20'}</p>
            </div>
            <div className="bg-indigo-900/30 p-2 rounded-lg text-center">
              <p className="text-[10px] text-indigo-300 uppercase font-bold mb-1">Yem Ver.</p>
              <p className="font-bold">{herdScoreData.breakdown.feedScore}/{isletmeTipi === 'Etçi' ? '30' : '10'}</p>
            </div>
          </div>
        </div>

        {/* Finansal Projeksiyon */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between">
          <TrendingUp className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-emerald-100 flex items-center gap-2">
                <BadgeDollarSign className="w-6 h-6" />
                30 Günlük Projeksiyon
              </h3>
              <button 
                onClick={() => setShowProjInfo(true)} 
                className="text-emerald-300 hover:text-white transition"
                title="30 Günlük Projeksiyon Nedir?"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-emerald-200 mb-6">
              {isletmeTipi === 'Etçi' 
                ? 'Mevcut verilere göre önümüzdeki 30 günün et geliri ve maliyet tahmini' 
                : 'Mevcut verilere göre önümüzdeki 30 günün süt geliri ve maliyet tahmini'}
            </p>
          </div>
          
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs text-emerald-200 uppercase font-bold tracking-wider mb-1">Tahmini Net Kar</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-black">{finProj.netProfit.toLocaleString('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits: 0})}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm bg-emerald-900/30 p-3 rounded-xl border border-emerald-500/30">
            <div className="flex justify-between items-center">
              <span className="text-emerald-200 flex items-center gap-1">
                {isletmeTipi === 'Etçi' ? <TrendingUp className="w-4 h-4"/> : <Droplets className="w-4 h-4"/>} 
                {isletmeTipi === 'Etçi' ? ' Beklenen Et Değer Artışı:' : ' Beklenen Süt Geliri:'}
              </span>
              <span className="font-bold">{finProj.expectedMilkRevenue.toLocaleString('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits: 0})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-300 flex items-center gap-1"><TrendingDown className="w-4 h-4 text-red-300"/> Beklenen Yem Gideri:</span>
              <span className="font-bold text-red-200">-{finProj.expectedFeedCost.toLocaleString('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits: 0})}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-300 flex items-center gap-1"><HeartPulse className="w-4 h-4 text-red-300"/> Beklenen Sağlık Gideri:</span>
              <span className="font-bold text-red-200">-{finProj.expectedHealthCost.toLocaleString('tr-TR', {style:'currency', currency:'TRY', maximumFractionDigits: 0})}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Sürü Üreme Performansı (İnekler) */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <CalendarCheck className="w-6 h-6 text-purple-700 dark:text-purple-400" />
          <h2 className="text-xl font-black text-purple-900">Sürü Üreme Performansı (İnek Ortalamaları)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100 shadow-sm">
            <p className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider mb-1">Servis Periyodu Ort.</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {herdPerformance.servisPeriyoduOrt !== null ? `${herdPerformance.servisPeriyoduOrt} Gün` : '-'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100 shadow-sm">
            <p className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider mb-1">Laktasyon Süresi Ort.</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {herdPerformance.ortalamaLaktasyonSuresiOrt !== null ? `${herdPerformance.ortalamaLaktasyonSuresiOrt} Gün` : '-'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100 shadow-sm">
            <p className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider mb-1">Gebelik Başına Tohum.</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {herdPerformance.gebelikBasinaTohumlamaOrt !== null ? herdPerformance.gebelikBasinaTohumlamaOrt : '-'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-purple-100 shadow-sm">
            <p className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider mb-1">Buzağılama Aralığı Ort.</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {herdPerformance.buzagilamaAraligiOrt !== null ? `${herdPerformance.buzagilamaAraligiOrt} Gün` : '-'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sol Kolon: Maliyet ve Tür Dağılımı */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-nature-600 to-nature-800 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
            <TrendingDown className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10" />
            <h3 className="text-lg font-bold text-nature-100 mb-1">Süt Yem Maliyeti</h3>
            <p className="text-sm text-nature-200 mb-4">Sütçü Rasyonu (Litre Başına)</p>
            
            {feedCost.isValid ? (
              <div className="flex items-end space-x-2">
                <span className="text-5xl font-black">{feedCost.cost.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                <span className="text-lg font-medium text-nature-200 mb-1">/ Lt</span>
              </div>
            ) : (
              <p className="text-nature-100 italic bg-nature-900/30 p-3 rounded-lg text-sm">Hesaplama için süt verimi ve Sütçü Rasyonu atanan gruplara ihtiyaç var.</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-700 p-6 rounded-2xl shadow-md text-white relative overflow-hidden">
            <TrendingDown className="absolute right-[-20px] bottom-[-20px] w-40 h-40 opacity-10" />
            <h3 className="text-lg font-bold text-orange-100 mb-1">Sürü Günlük Yem Gideri</h3>
            <p className="text-sm text-orange-200 mb-4">Tüm Rasyonların Toplamı</p>
            
            {totalFeedCost > 0 ? (
              <div className="flex items-end space-x-2">
                <span className="text-5xl font-black">{totalFeedCost.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}</span>
                <span className="text-lg font-medium text-orange-200 mb-1">/ Gün</span>
              </div>
            ) : (
              <p className="text-orange-100 italic bg-orange-900/30 p-3 rounded-lg text-sm">Gider hesabı için gruplara rasyon atamalısınız.</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-earth-900 dark:text-gray-100 mb-4">Tür Dağılımı</h3>
            {speciesDist.length > 0 ? (
              <div className="space-y-3">
                {speciesDist.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-earth-600 dark:text-gray-400 font-bold">{s.name}</span>
                    <span className="bg-earth-100 dark:bg-gray-800 text-earth-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-black">{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-6">
                <div className="bg-nature-100 dark:bg-nature-900/50 p-3 rounded-full text-nature-600 dark:text-nature-400 mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-earth-900 dark:text-gray-100 font-bold mb-1">Sürünüz Henüz Boş</p>
                <p className="text-earth-500 dark:text-gray-400 text-sm mb-4">Analizleri görmek için ilk hayvanınızı ekleyin.</p>
                <Link to="/hayvanlar" className="bg-nature-600 hover:bg-nature-700 text-white px-4 py-2 rounded-lg font-bold transition text-sm">
                  Hayvan Ekle
                </Link>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-earth-100 dark:border-gray-700">
              <Link to="/hayvanlar" className="text-nature-600 dark:text-nature-400 font-bold text-sm hover:underline">Hayvan Listesine Git &rarr;</Link>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Bugün Yapılacaklar (To-Do) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-earth-900 dark:text-gray-100">Bugün Yapılacaklar</h3>
            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{activeAlerts} Sistem Uyarısı</span>
          </div>

          <div className="flex-1 space-y-4">
             {/* Manuel To-Do Formu */}
             <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
               <input 
                 type="text" 
                 value={newTodo}
                 onChange={(e) => setNewTodo(e.target.value)}
                 placeholder="Bugün ne yapacaksınız? (Görev ekleyin...)"
                 className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-nature-500 text-sm"
               />
               <button type="submit" disabled={!newTodo.trim()} className="bg-nature-600 hover:bg-nature-700 text-white p-2 rounded-xl disabled:opacity-50 transition-colors">
                 <Plus className="w-5 h-5" />
               </button>
             </form>

             {/* Görevler Listesi */}
             {todos.length > 0 && (
               <div className="space-y-2 mb-6">
                 {todos.map(todo => {
                   const bgClass = todo.yapildiMi 
                     ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-60' 
                     : (todo.priority === 'Kritik' 
                         ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 shadow-sm' 
                         : todo.priority === 'Önemli' 
                           ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 shadow-sm' 
                           : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-sm');
                   
                   return (
                   <div key={todo.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${bgClass}`}>
                     <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => toggleTodo(todo.id, todo.yapildiMi)}>
                       <div className="mt-0.5">
                         {todo.yapildiMi ? <CheckCircle2 className="w-5 h-5 text-nature-500" /> : <Circle className="w-5 h-5 text-gray-400" />}
                       </div>
                       <div className="flex flex-col flex-1">
                         <span className={`text-sm font-medium ${todo.yapildiMi ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>{parseTodoText(todo.metin)}</span>
                         {todo.isSystem && !todo.yapildiMi && (
                           <div className="flex flex-wrap gap-2 mt-1.5">
                              {todo.priority && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${todo.priority === 'Kritik' ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300' : todo.priority === 'Önemli' ? 'bg-yellow-200 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>{todo.priority}</span>}
                              {todo.kategori && <span className="text-[10px] font-bold bg-earth-100 dark:bg-gray-700 text-earth-700 dark:text-gray-300 px-2 py-0.5 rounded-full">{todo.kategori}</span>}
                              {todo.hedefTarih && <span className="text-[10px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Hedef: {new Date(todo.hedefTarih).toLocaleDateString('tr-TR')}</span>}
                           </div>
                         )}
                       </div>
                     </div>
                     <button onClick={() => deleteTodo(todo.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors self-start">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 )})}
               </div>
             )}

            {activeAlerts === 0 && expectedBirths === 0 && heatChecks.length === 0 && reInseminations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-earth-400 space-y-3 py-8">
                <CalendarCheck className="w-16 h-16 opacity-50" />
                <p className="font-bold text-lg text-center">Planlanan acil bir sistem işlemi yok.</p>
              </div>
            ) : (
              <>
                {vaccineAlerts > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg"><Syringe className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                      <div>
                        <p className="font-bold text-red-900">Aşı ve Sağlık Uyarıları Mevcut</p>
                        <p className="text-sm text-red-700 dark:text-red-400">Gecikmiş aşıları kontrol et.</p>
                      </div>
                    </div>
                    {gecikmisAsilar.length > 0 && (
                      <div className="space-y-2 mt-3 pl-12">
                        {gecikmisAsilar.map(asi => {
                           const h = hayvanlar.find(x => x.id === asi.hayvanId);
                           return (
                             <div key={asi.id} className="text-sm flex justify-between bg-white/60 p-2 rounded-md border border-red-100">
                               <span className="font-bold text-red-800">{h?.kupeNo || 'Bilinmeyen'}</span>
                               <span className="text-red-600 dark:text-red-400 truncate ml-2">{asi.asiAd}</span>
                             </div>
                           )
                        })}
                      </div>
                    )}
                    <Link to="/saglik" className="mt-3 ml-12 inline-block text-red-600 dark:text-red-400 font-bold text-sm hover:underline">Tümünü Gör &rarr;</Link>
                  </div>
                )}

                {anomalyUyarilar.filter(u => u.siddet === 'KRITIK').length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg"><AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" /></div>
                      <div>
                        <p className="font-bold text-amber-900">Kritik Akıllı Uyarılar</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">Akıllı Uyarılar panelinden detayları inceleyin.</p>
                      </div>
                    </div>
                  </div>
                )}

                {expectedBirths > 0 && (
                  <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg"><CalfIcon className="w-5 h-5 text-pink-600" /></div>
                      <div>
                        <p className="font-bold text-pink-900">Yaklaşan ve Geciken Doğumlar</p>
                        <p className="text-sm text-pink-700">Yaklaşan veya tarihi geçmiş {expectedBirths} doğum var.</p>
                      </div>
                    </div>
                    {yaklasanDogumlar.length > 0 && (
                      <div className="space-y-2 mt-3 pl-12">
                        {yaklasanDogumlar.map((dogum, idx) => {
                           const h = hayvanlar.find(x => x.id === dogum.hayvanId);
                           const isOverdue = dogum.dogumTarihi < new Date(new Date().setHours(0,0,0,0));
                           return (
                             <div key={idx} className={`text-sm flex justify-between p-2 rounded-md border ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 shadow-sm' : 'bg-white/60 border-pink-100'}`}>
                               <span className={`font-bold ${isOverdue ? 'text-red-800' : 'text-pink-800'}`}>{h?.kupeNo || 'Bilinmeyen'}</span>
                               <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-bold' : 'text-pink-600'}>
                                 {dogum.dogumTarihi.toLocaleDateString('tr-TR')} {isOverdue && '(Gecikti)'}
                               </span>
                             </div>
                           )
                        })}
                      </div>
                    )}
                    <Link to="/ureme" className="mt-3 ml-12 inline-block text-pink-600 font-bold text-sm hover:underline">Üreme Takvimine Git &rarr;</Link>
                  </div>
                )}

                {heatChecks.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg"><Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
                      <div>
                        <p className="font-bold text-purple-900">Kızgınlık Beklentisi</p>
                        <p className="text-sm text-purple-700 dark:text-purple-400">Tohumlama/Boş sonrası {uremeAyarlari.kizginlikDongusu} gün döngüsü</p>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3 pl-12">
                      {heatChecks.slice(0, 3).map((item, idx) => {
                         const h = hayvanlar.find(x => x.id === item.hayvanId);
                         return (
                           <div key={idx} className="text-sm flex justify-between bg-white/60 p-2 rounded-md border border-purple-100">
                             <span className="font-bold text-purple-800">{h?.kupeNo || 'Bilinmeyen'}</span>
                             <span className="text-purple-600 dark:text-purple-400 truncate ml-2">Yaklaşık: {item.date.toLocaleDateString('tr-TR')}</span>
                           </div>
                         )
                      })}
                    </div>
                    <Link to="/ureme" className="mt-3 ml-12 inline-block text-purple-600 dark:text-purple-400 font-bold text-sm hover:underline">Üreme Takvimine Git &rarr;</Link>
                  </div>
                )}

                {reInseminations.length > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg"><CalendarCheck className="w-5 h-5 text-orange-600" /></div>
                      <div>
                        <p className="font-bold text-orange-900">Yeniden Tohumlama (Doğum Sonrası)</p>
                        <p className="text-sm text-orange-700">Doğum üzerinden {uremeAyarlari.yenidenTohumlamaUyarisi} gün geçenler</p>
                      </div>
                    </div>
                    <div className="space-y-2 mt-3 pl-12">
                      {reInseminations.slice(0, 3).map((item, idx) => {
                         const h = hayvanlar.find(x => x.id === item.hayvanId);
                         return (
                           <div key={idx} className="text-sm flex justify-between bg-white/60 p-2 rounded-md border border-orange-100">
                             <span className="font-bold text-orange-800">{h?.kupeNo || 'Bilinmeyen'}</span>
                             <span className="text-orange-600 truncate ml-2">Hazır: {item.date.toLocaleDateString('tr-TR')}</span>
                           </div>
                         )
                      })}
                    </div>
                    <Link to="/ureme" className="mt-3 ml-12 inline-block text-orange-600 font-bold text-sm hover:underline">Üreme Takvimine Git &rarr;</Link>
                  </div>
                )}
              </>
            )}

            {/* Bildirim İzni Durumu */}
            <div className="mt-4 p-4 bg-nature-50 dark:bg-nature-900/20 border border-nature-200 dark:border-nature-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white dark:bg-gray-800 p-2 rounded-lg">
                  <Bell className="w-5 h-5 text-nature-600 dark:text-nature-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-nature-900 dark:text-gray-100">Uygulama Kapalıyken Bildirim Alın</h4>
                  <p className="text-xs text-nature-700 dark:text-nature-400">
                    {pushStatus === 'granted' ? 'Bildirimlere izin verildi. Arka planda bildirim alacaksınız.' : 
                     pushStatus === 'denied' ? 'Bildirimler tarayıcınız tarafından engellendi. Ayarlardan açabilirsiniz.' : 
                     'Kritik görevler için bildirim almak ister misiniz?'}
                  </p>
                </div>
              </div>
              {pushStatus === 'default' && (
                <button onClick={handleSubscribe} className="bg-nature-600 hover:bg-nature-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
                  İzin Ver
                </button>
              )}
              {pushStatus === 'granted' && (
                <span className="text-xs font-bold text-nature-600 bg-nature-100 px-3 py-1 rounded-full">Aktif</span>
              )}
            </div>
            
          </div>
        </div>

      </div>

      {/* Akıllı Takvim Paneli */}
      <div className="mt-8">
        <SmartCalendar />
      </div>

      {showScoreInfo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-black text-earth-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              SürüMetri Skoru Nedir?
            </h3>
            <p className="text-sm text-earth-600 dark:text-gray-400 mb-4">
              SürüMetri Skoru işletmenizin genel sağlık, {isletmeTipi === 'Etçi' ? 'büyüme ve yem verimliliği' : 'üreme ve süt verimi'} performansını 100 üzerinden değerlendiren bilimsel temelli bir hesaplamadır.
            </p>
            <ul className="text-sm text-earth-700 dark:text-gray-300 space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <strong className="text-indigo-600 dark:text-indigo-400 min-w-[70px]">
                  {isletmeTipi === 'Etçi' ? 'Büyüme (40 Puan)' : 'Süt (40 Puan)'}
                </strong>
                <span>
                  {isletmeTipi === 'Etçi'
                    ? 'Ortalama canlı ağırlık artış (ADG) performansınıza göre değerlendirilir.'
                    : 'Son 7 günlük inek başı süt ortalamanızın ideal hedef değere (28 Lt) oranına göre hesaplanır.'}
                </span>
              </li>
              {isletmeTipi === 'Sütçü' && (
                <li className="flex items-start gap-2">
                  <strong className="text-indigo-600 dark:text-indigo-400 min-w-[70px]">Üreme (30 Puan)</strong>
                  <span>Ortalama buzağılama aralığı ve gebelik başına tohumlama sayınızın standartlara uygunluğuna göre belirlenir.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <strong className="text-indigo-600 dark:text-indigo-400 min-w-[70px]">
                  {isletmeTipi === 'Etçi' ? 'Sağlık (30 Puan)' : 'Sağlık (20 Puan)'}
                </strong>
                <span>
                  {isletmeTipi === 'Etçi'
                    ? 'Son 30 gündeki hayvan başı sağlık giderinizin kabul edilebilir sınırın altında olmasına göre ölçülür.'
                    : 'Son 30 gündeki inek başı sağlık giderinizin kabul edilebilir sınırın ne kadar altında olduğuna göre ölçülür.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <strong className="text-indigo-600 dark:text-indigo-400 min-w-[70px]">
                  {isletmeTipi === 'Etçi' ? 'Yem Ver. (30 Puan)' : 'Yem Ver. (10 Puan)'}
                </strong>
                <span>
                  {isletmeTipi === 'Etçi'
                    ? 'Günlük beklenen et değer artışının, toplam günlük yem giderinize oranına (FCR) göre hesaplanır.'
                    : 'Günlük süt gelirinizin, toplam günlük yem giderinize oranına (IOFC / Yemden yararlanma) göre hesaplanır.'}
                </span>
              </li>
            </ul>
            <button 
              onClick={() => setShowScoreInfo(false)} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold transition shadow-sm"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      )}

      {showProjInfo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-black text-earth-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <BadgeDollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              30 Günlük Projeksiyon Nedir?
            </h3>
            <p className="text-sm text-earth-600 dark:text-gray-400 mb-4">
              Mevcut verilerinize dayanarak önümüzdeki 30 gün içinde elde edilmesi beklenen net karı ve temel gider/gelir kalemlerini tahmin eder.
            </p>
            <ul className="text-sm text-earth-700 dark:text-gray-300 space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <strong className="text-emerald-600 dark:text-emerald-400 min-w-[140px]">
                  {isletmeTipi === 'Etçi' ? 'Beklenen Et Değer Artışı' : 'Beklenen Süt Geliri'}
                </strong>
                <span>
                  {isletmeTipi === 'Etçi'
                    ? 'Mevcut sürünüzün tahmini günlük canlı ağırlık artışı ve güncel canlı kilo fiyatı üzerinden hesaplanır.'
                    : 'Mevcut sağmal ineklerinizin son süt verimleri ve güncel süt litre fiyatı üzerinden hesaplanır.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <strong className="text-emerald-600 dark:text-emerald-400 min-w-[140px]">Beklenen Yem Gideri</strong>
                <span>Hayvanlarınızın bulunduğu gruplara atanan rasyon maliyetleri üzerinden günlük tüketim hesabı yapılarak belirlenir.</span>
              </li>
              <li className="flex items-start gap-2">
                <strong className="text-emerald-600 dark:text-emerald-400 min-w-[140px]">Beklenen Sağlık Gideri</strong>
                <span>Sürünüzdeki son sağlık olaylarının maliyetlerine dayanarak önümüzdeki 30 gün için öngörülen tahmini sağlık gideridir.</span>
              </li>
            </ul>
            <button 
              onClick={() => setShowProjInfo(false)} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-bold transition shadow-sm"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
