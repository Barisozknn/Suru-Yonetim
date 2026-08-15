import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info, GitMerge, FileText, Activity, Edit2, TrendingUp, Save, X } from 'lucide-react';
import { COMMON_DISEASES, normalizeDiseaseName } from '../constants/diseases';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import AnimalForm from './AnimalForm';
import PedigreeTree from './PedigreeTree';
import MilkRecords from './MilkRecords';
import WeightRecords from './WeightRecords';
import HealthTimeline from './HealthTimeline';
import ReproductionTimeline from './ReproductionTimeline';
import CalfFormModal from './CalfFormModal';
import MaleReproductionTimeline from './MaleReproductionTimeline';
import AnimalProfitability from './AnimalProfitability';
import { calculateAgeInDays, calculateGrowthStatus } from '../utils/calfCalculations';
import { calculateFemalePerformance, calculateMalePerformance, formatDaysToText } from '../utils/performanceCalculations';
import { CalendarDays, Droplets, Trophy, Banknote } from 'lucide-react';
import { PiCow } from 'react-icons/pi';
import { useNavigate, useLocation } from 'react-router-dom';

interface AnimalDetailProps {
  id: string;
  onBack: () => void;
}

const AnimalDetail: React.FC<AnimalDetailProps> = ({ id, onBack }) => {
  const navigate = useNavigate();
  const hayvan = useLiveFarmQuery(() => db.hayvanlar.get(id), [id]);
  const grup = useLiveFarmQuery(
    async () => hayvan?.grupId ? await db.gruplar.get(hayvan.grupId) : undefined,
    [hayvan?.grupId]
  );

  const buzagiKaydi = useLiveFarmQuery(() => db.buzagiKayitlari.where('hayvanId').equals(id).first(), [id]);
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.where('hayvanId').equals(id).toArray(), [id]) || [];
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.where('hayvanId').equals(id).toArray(), [id]) || [];
  const allUremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray(), []) || [];

  const dogumSekliDagilimi = React.useMemo(() => {
    if (hayvan?.cinsiyet !== 'Dişi') return null;
    const dagilim = { 'Sağlıklı': 0, 'Güç Doğum': 0, 'Ölü Doğum': 0, 'Düşük': 0 };
    let total = 0;
    const dogumlar = uremeKayitlari.filter(u => u.tur === 'Doğum');
    dogumlar.forEach(d => {
      const degerlendirme = d.detaylar?.dogumDegerlendirmesi;
      if (degerlendirme && dagilim[degerlendirme as keyof typeof dagilim] !== undefined) {
        dagilim[degerlendirme as keyof typeof dagilim]++;
        total++;
      }
    });
    return { dagilim, total };
  }, [hayvan?.cinsiyet, uremeKayitlari]);

  const [activeTab, setActiveTab] = useState<'ozet' | 'verim' | 'soy' | 'saglik' | 'ureme' | 'notlar' | 'ekonomi'>('ozet');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isCalfFormOpen, setIsCalfFormOpen] = useState(false);

  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['ozet', 'verim', 'soy', 'saglik', 'ureme', 'notlar', 'ekonomi'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  const [notlarText, setNotlarText] = useState('');
  const [isSavingNotlar, setIsSavingNotlar] = useState(false);

  useEffect(() => {
    if (hayvan?.notlar !== undefined) {
      setNotlarText(hayvan.notlar);
    } else {
      setNotlarText('');
    }
  }, [hayvan?.notlar, activeTab]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<'Aktif' | 'Satıldı' | 'Öldü'>('Aktif');
  
  // Sale details
  const [satisTarihi, setSatisTarihi] = useState(new Date().toISOString().split('T')[0]);
  const [satisFiyati, setSatisFiyati] = useState<number | ''>('');
  
  // Death details
  const [olumTarihi, setOlumTarihi] = useState(new Date().toISOString().split('T')[0]);
  const [olumNedeniTipi, setOlumNedeniTipi] = useState<'Doğal' | 'Kaza' | 'Hastalık' | 'Diğer'>('Doğal');
  const [olumNedeniDetay, setOlumNedeniDetay] = useState('');
  const [showHastalikDropdown, setShowHastalikDropdown] = useState(false);

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hayvan) return;
    
    const updates: any = { durum: newStatus };
    
    if (newStatus === 'Satıldı') {
      updates.satisTarihi = satisTarihi;
      updates.satisFiyati = satisFiyati === '' ? 0 : Number(satisFiyati);
      updates.grupId = null; // Remove from group
    } else if (newStatus === 'Öldü') {
      updates.olumTarihi = olumTarihi;
      updates.olumNedeniTipi = olumNedeniTipi;
      updates.olumNedeniDetay = olumNedeniTipi === 'Hastalık' && olumNedeniDetay.trim() 
        ? normalizeDiseaseName(olumNedeniDetay) 
        : olumNedeniDetay;
      updates.grupId = null; // Remove from group
    } else {
      // Aktif
      updates.satisTarihi = null;
      updates.satisFiyati = null;
      updates.olumTarihi = null;
      updates.olumNedeniTipi = null;
      updates.olumNedeniDetay = null;
    }

    try {
      await db.hayvanlar.update(hayvan.id, updates);
      await db.syncQueue.add({
        table: 'hayvanlar',
        action: 'UPDATE',
        payload: { ...hayvan, ...updates },
        created_at: Date.now()
      });
      if (navigator.onLine) {
        const { processSyncQueue } = await import('../services/syncService');
        processSyncQueue();
      }
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Durum güncellenirken hata oluştu.');
    }
  };

  const handleSaveNotlar = async () => {
    if (!hayvan) return;
    setIsSavingNotlar(true);
    try {
      await db.hayvanlar.update(id, { notlar: notlarText });
      await db.syncQueue.add({
        table: 'hayvanlar',
        action: 'UPDATE',
        payload: { ...hayvan, notlar: notlarText },
        created_at: Date.now()
      });
      if (navigator.onLine) {
        const { processSyncQueue } = await import('../services/syncService');
        processSyncQueue();
      }
    } catch (err) {
      console.error(err);
      alert('Notlar kaydedilirken hata oluştu.');
    } finally {
      setIsSavingNotlar(false);
    }
  };

  const getYasMetni = (dogumTarihi: string) => {
    const yasGun = calculateAgeInDays(dogumTarihi);
    if (yasGun >= 365) {
      const yas = Math.floor(yasGun / 365);
      const ay = Math.floor((yasGun % 365) / 30);
      return ay > 0 ? `${yas} Yaş, ${ay} Ay` : `${yas} Yaş`;
    }
    if (yasGun >= 30) {
      const ay = Math.floor(yasGun / 30);
      const gun = yasGun % 30;
      return gun > 0 ? `${ay} Ay ${gun} Günlük` : `${ay} Aylık`;
    }
    return `${yasGun} Günlük`;
  };

  if (hayvan === undefined) {
    return <div className="text-center py-12 text-earth-600 dark:text-gray-400 font-bold">Yükleniyor...</div>;
  }

  if (!hayvan) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Hayvan bulunamadı!</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-nature-600 text-white rounded-lg">Geri Dön</button>
      </div>
    );
  }



  const tabs = [
    { id: 'ozet', label: 'Özet', icon: <Info className="w-4 h-4" /> },
    { id: 'verim', label: 'Verim & Ağırlık', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'soy', label: 'Soy Ağacı', icon: <GitMerge className="w-4 h-4" /> },
    { id: 'saglik', label: 'Sağlık', icon: <Activity className="w-4 h-4" /> },
    ...(['Buzağı', 'Dana', 'Öküz'].includes(hayvan.tur) ? [] : [{ id: 'ureme', label: 'Üreme', icon: <CalendarDays className="w-4 h-4" /> }]),
    ...(hayvan.tur !== 'Buzağı' ? [{ id: 'ekonomi', label: 'Ekonomi', icon: <Banknote className="w-4 h-4" /> }] : []),
    { id: 'notlar', label: 'Notlar', icon: <FileText className="w-4 h-4" /> },
  ];

  const isFemale = ['İnek', 'Düve'].includes(hayvan.tur);
  const isMale = ['Tosun', 'Boğa'].includes(hayvan.tur);

  const femalePerf = isFemale ? calculateFemalePerformance(hayvan, uremeKayitlari) : null;
  const malePerf = isMale ? calculateMalePerformance(hayvan, uremeKayitlari, agirlikKayitlari, buzagiKaydi, allUremeKayitlari) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 bg-earth-200 text-earth-700 dark:text-gray-300 rounded-full hover:bg-nature-500 hover:text-white transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-earth-900 dark:text-gray-100">{hayvan.kupeNo}</h2>
            <p className="text-earth-600 dark:text-gray-400 font-medium">{hayvan.tur} &bull; {hayvan.irk}</p>
          </div>
        </div>
        <button onClick={() => setIsEditFormOpen(true)} className="flex items-center space-x-2 px-4 py-2 border border-nature-500 text-nature-700 dark:text-nature-300 rounded-lg font-bold hover:bg-nature-50 dark:hover:bg-nature-900/30 transition">
          <Edit2 className="w-4 h-4" />
          <span className="hidden sm:inline">Düzenle</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-bold whitespace-nowrap transition ${activeTab === tab.id
                ? 'bg-nature-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-earth-600 dark:text-gray-400 border border-earth-200 dark:border-gray-700 hover:bg-earth-100 dark:hover:bg-gray-700'
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 min-h-[300px]">
        {activeTab === 'ozet' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Fotoğraf */}
            {hayvan.fotografUrl && (
              <div className="sm:col-span-2 flex justify-center">
                <img src={hayvan.fotografUrl} alt={hayvan.kupeNo} className="w-40 h-40 rounded-2xl object-cover border-4 border-nature-200 dark:border-nature-800 shadow-md" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">Durum</label>
              <button 
                onClick={() => {
                  setNewStatus(hayvan.durum as any);
                  if (hayvan.satisTarihi) setSatisTarihi(hayvan.satisTarihi);
                  if (hayvan.satisFiyati) setSatisFiyati(hayvan.satisFiyati);
                  if (hayvan.olumTarihi) setOlumTarihi(hayvan.olumTarihi);
                  if (hayvan.olumNedeniTipi) setOlumNedeniTipi(hayvan.olumNedeniTipi as any);
                  if (hayvan.olumNedeniDetay) setOlumNedeniDetay(hayvan.olumNedeniDetay);
                  setIsStatusModalOpen(true);
                }}
                className="group flex items-center space-x-2 p-1.5 -ml-1.5 rounded-lg hover:bg-earth-100 dark:hover:bg-gray-700 transition cursor-pointer"
                title="Durumu Değiştir"
              >
                <p className={`text-lg font-semibold ${
                  hayvan.durum === 'Aktif' ? 'text-green-600 dark:text-green-400' :
                  hayvan.durum === 'Satıldı' ? 'text-blue-600 dark:text-blue-400' :
                  'text-red-600 dark:text-red-400'
                }`}>{hayvan.durum}</p>
                <Edit2 className="w-4 h-4 text-earth-400 group-hover:text-nature-600 transition" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">Grup</label>
              <p className="text-lg font-semibold text-earth-900 dark:text-gray-100">{grup?.ad || 'Atanmamış'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">Cinsiyet</label>
              <p className="text-lg font-semibold text-earth-900 dark:text-gray-100">{hayvan.cinsiyet}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">Doğum Tarihi</label>
              <p className="text-lg font-semibold text-earth-900 dark:text-gray-100">
                {new Date(hayvan.dogumTarihi).toLocaleDateString('tr-TR')}
                <span className="text-sm font-bold text-earth-500 dark:text-gray-400 ml-2">({getYasMetni(hayvan.dogumTarihi)})</span>
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">Çiftliğe Geliş Tarihi</label>
              <p className="text-lg font-semibold text-earth-900 dark:text-gray-100">
                {hayvan.ciftligeGelisTarihi ? new Date(hayvan.ciftligeGelisTarihi).toLocaleDateString('tr-TR') : '-'}
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2 bg-nature-50 dark:bg-nature-900/30 p-4 rounded-xl border border-nature-200 dark:border-nature-800 flex justify-between items-center">
              <label className="text-sm font-bold text-nature-700 dark:text-nature-300 uppercase tracking-wider">Güncel Ağırlık</label>
              <p className="text-3xl font-black text-nature-800 dark:text-nature-200">{hayvan.guncelAgirlikKg} <span className="text-lg font-bold">kg</span></p>
            </div>

            {/* Dişi Performans Kartı */}
            {isFemale && femalePerf && (
              <div className="sm:col-span-2 bg-purple-50 dark:bg-purple-900/20 p-5 rounded-2xl border border-purple-200 dark:border-purple-800/50 mt-2">
                <div className="flex items-center space-x-2 text-purple-800 mb-4">
                  <Trophy className="w-6 h-6" />
                  <h3 className="text-lg font-black">Performans Verileri</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Güncel Laktasyon Süresi</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{formatDaysToText(femalePerf.laktasyonSuresiGun)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Ort. Laktasyon Süresi</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">
                      {femalePerf.ortalamaLaktasyonSuresiGun !== null ? `${femalePerf.ortalamaLaktasyonSuresiGun} Gün` : '-'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Laktasyon Sayısı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{femalePerf.laktasyonSayisi > 0 ? femalePerf.laktasyonSayisi : '-'}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">İlk Tohumlama Yaşı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{formatDaysToText(femalePerf.ilkTohumlamaYasiGun)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">İlk Gebelik Yaşı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{formatDaysToText(femalePerf.ilkGebelikYasiGun)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">İlkine Buzağılama Yaşı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{formatDaysToText(femalePerf.ilkBuzagilamaYasiGun)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Buzağılama Aralığı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{formatDaysToText(femalePerf.buzagilamaArasiSureGun)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Servis Periyodu</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">
                      {femalePerf.servisPeriyoduGun !== null ? `${femalePerf.servisPeriyoduGun} Gün` : '-'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-purple-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Gebelik Başına Tohum.</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{femalePerf.gebelikBasinaTohumlama !== null ? femalePerf.gebelikBasinaTohumlama : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Doğum Şekli Dağılımı Kartı (Sadece Dişiler) */}
            {isFemale && dogumSekliDagilimi && (
              <div className="sm:col-span-2 bg-pink-50 dark:bg-pink-900/20 p-5 rounded-2xl border border-pink-200 dark:border-pink-800/50 mt-2">
                <div className="flex items-center space-x-2 text-pink-800 mb-4">
                  <PiCow className="w-6 h-6" />
                  <h3 className="text-lg font-black">Yavru Doğum Şekli Analizi</h3>
                </div>
                {dogumSekliDagilimi.total > 0 ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 w-full flex bg-gray-200 dark:bg-gray-700 h-6 rounded-full overflow-hidden">
                      {dogumSekliDagilimi.dagilim['Sağlıklı'] > 0 && (
                        <div style={{ width: `${(dogumSekliDagilimi.dagilim['Sağlıklı'] / dogumSekliDagilimi.total) * 100}%` }} className="bg-emerald-500 h-full"></div>
                      )}
                      {dogumSekliDagilimi.dagilim['Güç Doğum'] > 0 && (
                        <div style={{ width: `${(dogumSekliDagilimi.dagilim['Güç Doğum'] / dogumSekliDagilimi.total) * 100}%` }} className="bg-orange-500 h-full"></div>
                      )}
                      {dogumSekliDagilimi.dagilim['Ölü Doğum'] > 0 && (
                        <div style={{ width: `${(dogumSekliDagilimi.dagilim['Ölü Doğum'] / dogumSekliDagilimi.total) * 100}%` }} className="bg-red-500 h-full"></div>
                      )}
                      {dogumSekliDagilimi.dagilim['Düşük'] > 0 && (
                        <div style={{ width: `${(dogumSekliDagilimi.dagilim['Düşük'] / dogumSekliDagilimi.total) * 100}%` }} className="bg-purple-500 h-full"></div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 justify-center text-sm font-bold">
                      <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span>Sağlıklı ({dogumSekliDagilimi.dagilim['Sağlıklı']})</span>
                      </div>
                      <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span>Güç Doğum ({dogumSekliDagilimi.dagilim['Güç Doğum']})</span>
                      </div>
                      <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Ölü Doğum ({dogumSekliDagilimi.dagilim['Ölü Doğum']})</span>
                      </div>
                      <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span>Düşük ({dogumSekliDagilimi.dagilim['Düşük']})</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-earth-500 dark:text-gray-400 font-medium">
                    Henüz bu ineğe ait yavruların doğum şekli verisi girilmemiş.
                  </div>
                )}
              </div>
            )}

            {/* Erkek Performans Kartı */}
            {isMale && malePerf && (
              <div className="sm:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-200 mt-2">
                <div className="flex items-center space-x-2 text-indigo-800 mb-4">
                  <Trophy className="w-6 h-6" />
                  <h3 className="text-lg font-black">Performans Verileri</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">İlkine Damızlıkta Kullanma Yaşı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">{formatDaysToText(malePerf.ilkDamizlikYasiGun)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">
                      Genel Canlı Ağırlık Artışı <span className="font-normal text-[10px]">(Tüm tartımlar)</span>
                    </p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">
                      {malePerf.gunlukAgirlikArtisiKg !== null ? `${malePerf.gunlukAgirlikArtisiKg} kg/gün` : '-'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-indigo-100">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Aşım Başarısı / Gebelik Oranı</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100 flex items-baseline space-x-1">
                      <span>{malePerf.asimBasarisiYuzde !== null ? `%${malePerf.asimBasarisiYuzde}` : '-'}</span>
                      {malePerf.degerlendirilenAsimSayisi > 0 && (
                        <span className="text-[10px] text-earth-500 font-normal">
                          ({malePerf.degerlendirilenAsimSayisi} işlem baz alındı)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Buzağı Gelişim Kartı */}
            {(hayvan.tur === 'Buzağı' || calculateAgeInDays(hayvan.dogumTarihi) <= 180) && (
              <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-200 dark:border-blue-800/50 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <PiCow className="w-6 h-6" />
                    <h3 className="text-lg font-black">Buzağı Büyütme Takibi</h3>
                  </div>
                  <button onClick={() => setIsCalfFormOpen(true)} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition">
                    Kaydı Düzenle
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-blue-100 flex items-center space-x-3">
                    <Droplets className={`w-8 h-8 ${buzagiKaydi?.agizSutuVerildi ? 'text-blue-500' : 'text-earth-300'}`} />
                    <div>
                      <p className="text-xs font-bold text-earth-500 dark:text-gray-400">Ağız Sütü</p>
                      <p className="font-bold text-earth-900 dark:text-gray-100">{buzagiKaydi?.agizSutuVerildi ? `${buzagiKaydi.agizSutuMiktarLt || '-'} Lt (${buzagiKaydi.agizSutuSaatSonra || '-'} Saat)` : 'Verilmedi'}</p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-blue-100 flex flex-col justify-center">
                    <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Doğum / Sütten Kesim Hedefi</p>
                    <p className="font-bold text-earth-900 dark:text-gray-100">
                      {buzagiKaydi?.dogumAgirligiKg || '-'} kg <span className="text-earth-400 font-normal mx-1">/</span> {buzagiKaydi?.hedefSuttenKesimAgirligiKg || '-'} kg
                    </p>
                  </div>

                  {buzagiKaydi?.hedefSuttenKesimAgirligiKg && (
                    <div className={`p-3 rounded-xl border flex items-center space-x-3 ${calculateGrowthStatus(hayvan.guncelAgirlikKg, buzagiKaydi.hedefSuttenKesimAgirligiKg).color}`}>
                      <Activity className="w-8 h-8 opacity-70" />
                      <div>
                        <p className="text-xs font-bold opacity-80">Büyüme Hedefi</p>
                        <p className="font-black">
                          % {Math.round(calculateGrowthStatus(hayvan.guncelAgirlikKg, buzagiKaydi.hedefSuttenKesimAgirligiKg).percentage)} ({calculateGrowthStatus(hayvan.guncelAgirlikKg, buzagiKaydi.hedefSuttenKesimAgirligiKg).status})
                        </p>
                      </div>
                    </div>
                  )}

                  {hayvan.notlar && (
                    <div className="sm:col-span-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-blue-100 mt-2">
                      <p className="text-xs font-bold text-earth-500 dark:text-gray-400 mb-1">Doğum Değerlendirmesi / Notlar</p>
                      <p className="text-sm font-semibold text-earth-900 dark:text-gray-100">{hayvan.notlar}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'soy' && (
          <PedigreeTree hayvan={hayvan} onSelectAnimal={(childId) => navigate(`/hayvanlar?id=${childId}`)} />
        )}

        {activeTab === 'verim' && (
          <div className="space-y-8">
            {['İnek', 'Düve'].includes(hayvan.tur) && (
              <MilkRecords hayvan={hayvan} />
            )}
            <WeightRecords hayvan={hayvan} />
          </div>
        )}

        {activeTab === 'saglik' && <HealthTimeline hayvanId={hayvan.id} />}
        {activeTab === 'ekonomi' && <AnimalProfitability hayvan={hayvan} />}
        {activeTab === 'ureme' && (
          isMale ? (
            ['Boğa', 'Tosun'].includes(hayvan.tur) ? (
              <MaleReproductionTimeline hayvan={hayvan} />
            ) : (
              <div className="text-center py-12 text-earth-500 dark:text-gray-400 bg-earth-50 dark:bg-gray-900 rounded-xl border border-earth-200 dark:border-gray-700">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Bu hayvan damızlık vasıfta veya yaşta değildir. Sadece Boğa ve Tosunlar için üreme kaydı girilebilir.</p>
              </div>
            )
          ) : (
            <ReproductionTimeline hayvanId={id} />
          )
        )}

        {activeTab === 'notlar' && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-earth-900 dark:text-gray-100 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-earth-500 dark:text-gray-400" />
                <span>Hayvan Notları</span>
              </h3>
              <button
                onClick={handleSaveNotlar}
                disabled={isSavingNotlar}
                className="flex items-center space-x-2 bg-nature-600 hover:bg-nature-700 text-white px-4 py-2 rounded-lg font-bold transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingNotlar ? 'Kaydediliyor...' : 'Kaydet'}</span>
              </button>
            </div>
            <textarea
              className="flex-1 w-full p-4 border border-earth-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-nature-500 focus:border-transparent resize-none text-earth-800 dark:text-gray-200 bg-earth-50 dark:bg-gray-900"
              placeholder="Bu hayvana ait özel notlarınızı, tedavi detaylarını, alışkanlıklarını veya diğer bilgileri buraya yazabilirsiniz..."
              value={notlarText}
              onChange={(e) => setNotlarText(e.target.value)}
            />
          </div>
        )}
      </div>

      {isEditFormOpen && (
        <AnimalForm
          initialData={{
            ...hayvan,
            grupId: hayvan.grupId || undefined,
            anneKupeNo: hayvan.anneKupeNo || undefined,
            babaKupeNo: hayvan.babaKupeNo || undefined,
            fotografUrl: hayvan.fotografUrl || undefined,
          }}
          onClose={() => setIsEditFormOpen(false)}
          onSuccess={() => setIsEditFormOpen(false)}
        />
      )}

      {isCalfFormOpen && (
        <CalfFormModal
          hayvanId={id}
          onClose={() => setIsCalfFormOpen(false)}
        />
      )}
      
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-earth-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl flex flex-col">
            <div className="p-6 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-nature-50 dark:bg-nature-900/30 rounded-t-2xl">
              <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">
                Durum Değiştir
              </h2>
              <button type="button" onClick={() => setIsStatusModalOpen(false)} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleStatusChange} className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-sm font-bold text-earth-700 dark:text-gray-300">Yeni Durum</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full p-3 border border-earth-300 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-800 font-medium"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Satıldı">Satıldı</option>
                  <option value="Öldü">Öldü</option>
                </select>
              </div>

              {newStatus === 'Satıldı' && (
                <div className="space-y-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                  <h4 className="font-bold text-blue-800 dark:text-blue-400">Satış Kayıt Bilgileri</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">Satış Fiyatı (₺)</label>
                      <input
                        type="number"
                        required
                        value={satisFiyati}
                        onChange={(e) => setSatisFiyati(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full p-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                        placeholder="Örn: 85000"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-blue-700 dark:text-blue-300">Satış Tarihi</label>
                      <input
                        type="date"
                        required
                        value={satisTarihi}
                        onChange={(e) => setSatisTarihi(e.target.value)}
                        className="w-full p-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newStatus === 'Öldü' && (
                <div className="space-y-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800/30">
                  <h4 className="font-bold text-red-800 dark:text-red-400">Ölüm Kayıt Bilgileri</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-red-700 dark:text-red-300">Ölüm Tarihi</label>
                        <input
                          type="date"
                          required
                          value={olumTarihi}
                          onChange={(e) => setOlumTarihi(e.target.value)}
                          className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-red-700 dark:text-red-300">Ölüm Nedeni Tipi</label>
                        <select
                          value={olumNedeniTipi}
                          onChange={(e) => {
                            setOlumNedeniTipi(e.target.value as any);
                            setOlumNedeniDetay('');
                          }}
                          className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                        >
                          <option value="Hastalık">Hastalık</option>
                          <option value="Kaza / Travma">Kaza / Travma</option>
                          <option value="Zehirlenme">Zehirlenme</option>
                          <option value="Güç Doğum">Güç Doğum</option>
                          <option value="Yaşlılık">Yaşlılık</option>
                          <option value="Diğer">Diğer Nedenler</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1 relative">
                      <label className="text-sm font-semibold text-red-700 dark:text-red-300">
                        {olumNedeniTipi === 'Hastalık' ? 'Hastalık Adı' : 'Nedeni Belirtin'}
                      </label>
                      {olumNedeniTipi === 'Hastalık' ? (
                        <div>
                          <input
                            type="text"
                            required
                            value={olumNedeniDetay}
                            onChange={e => {
                              setOlumNedeniDetay(e.target.value);
                              setShowHastalikDropdown(true);
                            }}
                            onFocus={() => setShowHastalikDropdown(true)}
                            onBlur={() => setTimeout(() => setShowHastalikDropdown(false), 200)}
                            placeholder="Örn: Ketozis (Seçin/Yazın)"
                            className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                          />
                          {showHastalikDropdown && (
                            <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-red-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                              {COMMON_DISEASES.filter(d => d.toLocaleLowerCase('tr-TR').includes(olumNedeniDetay.toLocaleLowerCase('tr-TR'))).map(d => (
                                <li
                                  key={d}
                                  onMouseDown={() => { setOlumNedeniDetay(d); setShowHastalikDropdown(false); }}
                                  className="px-3 py-2 text-sm text-earth-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer"
                                >
                                  {d}
                                </li>
                              ))}
                              {olumNedeniDetay && !COMMON_DISEASES.some(d => d.toLocaleLowerCase('tr-TR') === olumNedeniDetay.toLocaleLowerCase('tr-TR')) && (
                                <li
                                  onMouseDown={() => setShowHastalikDropdown(false)}
                                  className="px-3 py-2 text-sm text-red-600 dark:text-red-400 italic bg-red-50/50 dark:bg-red-900/10 cursor-pointer"
                                >
                                  "{olumNedeniDetay}" olarak kaydet
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          required
                          value={olumNedeniDetay}
                          onChange={e => setOlumNedeniDetay(e.target.value)}
                          placeholder="Örn: Boğulma, Kaza vb."
                          className="w-full p-2 border border-red-300 dark:border-red-600 rounded-lg focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-800"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-earth-300 dark:border-gray-600 text-earth-700 dark:text-gray-300 rounded-xl font-bold hover:bg-earth-50 dark:hover:bg-gray-700 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-nature-600 text-white rounded-xl font-bold hover:bg-nature-700 transition shadow-md hover:shadow-lg"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimalDetail;
