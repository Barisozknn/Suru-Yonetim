import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info, GitMerge, FileText, Activity, Edit2, TrendingUp, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import AnimalForm from './AnimalForm';
import PedigreeTree from './PedigreeTree';
import MilkRecords from './MilkRecords';
import WeightRecords from './WeightRecords';
import HealthTimeline from './HealthTimeline';
import ReproductionTimeline from './ReproductionTimeline';
import CalfFormModal from './CalfFormModal';
import MaleReproductionTimeline from './MaleReproductionTimeline';
import { calculateAgeInDays, calculateGrowthStatus } from '../utils/calfCalculations';
import { CalendarDays, Droplets } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AnimalDetailProps {
  id: string;
  onBack: () => void;
}

const AnimalDetail: React.FC<AnimalDetailProps> = ({ id, onBack }) => {
  const navigate = useNavigate();
  const hayvan = useLiveQuery(() => db.hayvanlar.get(id), [id]);
  const grup = useLiveQuery(
    async () => hayvan?.grupId ? await db.gruplar.get(hayvan.grupId) : undefined,
    [hayvan?.grupId]
  );

  const buzagiKaydi = useLiveQuery(() => db.buzagiKayitlari.where('hayvanId').equals(id).first(), [id]);

  const [activeTab, setActiveTab] = useState<'ozet' | 'verim' | 'soy' | 'saglik' | 'ureme' | 'notlar'>('ozet');
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [isCalfFormOpen, setIsCalfFormOpen] = useState(false);

  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['ozet', 'verim', 'soy', 'saglik', 'ureme', 'notlar'].includes(tabParam)) {
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
    if (yasGun > 365) {
      const yas = Math.floor(yasGun / 365);
      const ay = Math.floor((yasGun % 365) / 30);
      return ay > 0 ? `${yas} Yaş, ${ay} Ay` : `${yas} Yaş`;
    }
    if (yasGun > 30) {
      return `${Math.floor(yasGun / 30)} Aylık`;
    }
    return `${yasGun} Günlük`;
  };

  if (hayvan === undefined) {
    return <div className="text-center py-12 text-earth-600 font-bold">Yükleniyor...</div>;
  }

  if (!hayvan) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Hayvan bulunamadı!</p>
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
    { id: 'notlar', label: 'Notlar', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 bg-earth-200 text-earth-700 rounded-full hover:bg-nature-500 hover:text-white transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-earth-900">{hayvan.kupeNo}</h2>
            <p className="text-earth-600 font-medium">{hayvan.tur} &bull; {hayvan.irk}</p>
          </div>
        </div>
        <button onClick={() => setIsEditFormOpen(true)} className="flex items-center space-x-2 px-4 py-2 border border-nature-500 text-nature-700 rounded-lg font-bold hover:bg-nature-50 transition">
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
                : 'bg-white text-earth-600 border border-earth-200 hover:bg-earth-100'
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 min-h-[300px]">
        {activeTab === 'ozet' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Fotoğraf */}
            {hayvan.fotografUrl && (
              <div className="sm:col-span-2 flex justify-center">
                <img src={hayvan.fotografUrl} alt={hayvan.kupeNo} className="w-40 h-40 rounded-2xl object-cover border-4 border-nature-200 shadow-md" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 uppercase tracking-wider">Durum</label>
              <p className="text-lg font-semibold text-earth-900">{hayvan.durum}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 uppercase tracking-wider">Grup</label>
              <p className="text-lg font-semibold text-earth-900">{grup?.ad || 'Atanmamış'}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 uppercase tracking-wider">Cinsiyet</label>
              <p className="text-lg font-semibold text-earth-900">{hayvan.cinsiyet}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-earth-500 uppercase tracking-wider">Doğum Tarihi</label>
              <p className="text-lg font-semibold text-earth-900">
                {new Date(hayvan.dogumTarihi).toLocaleDateString('tr-TR')}
                <span className="text-sm font-bold text-earth-500 ml-2">({getYasMetni(hayvan.dogumTarihi)})</span>
              </p>
            </div>
            <div className="space-y-1 sm:col-span-2 bg-nature-50 p-4 rounded-xl border border-nature-200 flex justify-between items-center">
              <label className="text-sm font-bold text-nature-700 uppercase tracking-wider">Güncel Ağırlık</label>
              <p className="text-3xl font-black text-nature-800">{hayvan.guncelAgirlikKg} <span className="text-lg font-bold">kg</span></p>
            </div>

            {/* Buzağı Gelişim Kartı */}
            {(hayvan.tur === 'Buzağı' || calculateAgeInDays(hayvan.dogumTarihi) <= 180) && (
              <div className="sm:col-span-2 bg-blue-50 p-5 rounded-2xl border border-blue-200 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Droplets className="w-6 h-6" />
                    <h3 className="text-lg font-black">Buzağı Büyütme Takibi</h3>
                  </div>
                  <button onClick={() => setIsCalfFormOpen(true)} className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition">
                    Kaydı Düzenle
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center space-x-3">
                    <Droplets className={`w-8 h-8 ${buzagiKaydi?.agizSutuVerildi ? 'text-blue-500' : 'text-earth-300'}`} />
                    <div>
                      <p className="text-xs font-bold text-earth-500">Ağız Sütü</p>
                      <p className="font-bold text-earth-900">{buzagiKaydi?.agizSutuVerildi ? `${buzagiKaydi.agizSutuMiktarLt || '-'} Lt (${buzagiKaydi.agizSutuSaatSonra || '-'} Saat)` : 'Verilmedi'}</p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-blue-100 flex flex-col justify-center">
                    <p className="text-xs font-bold text-earth-500 mb-1">Doğum / Sütten Kesim Hedefi</p>
                    <p className="font-bold text-earth-900">
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
                    <div className="sm:col-span-3 bg-white p-3 rounded-xl border border-blue-100 mt-2">
                      <p className="text-xs font-bold text-earth-500 mb-1">Doğum Değerlendirmesi / Notlar</p>
                      <p className="text-sm font-semibold text-earth-900">{hayvan.notlar}</p>
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

        {activeTab === 'saglik' && (
          <HealthTimeline hayvanId={id} />
        )}

        {activeTab === 'ureme' && (
          hayvan.cinsiyet === 'Erkek' ? (
            ['Boğa', 'Tosun'].includes(hayvan.tur) ? (
              <MaleReproductionTimeline hayvan={hayvan} />
            ) : (
              <div className="text-center py-12 text-earth-500 bg-earth-50 rounded-xl border border-earth-200">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Bu hayvan damızlık vasıfta veya yaşta değildir. Sadece Boğa ve Tosunlar için üreme kaydı girilebilir.</p>
              </div>
            )
          ) : (
            <ReproductionTimeline hayvanId={id} />
          )
        )}

        {activeTab === 'notlar' && (
          <div className="bg-white p-6 rounded-xl border border-earth-200 shadow-sm flex flex-col h-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-earth-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-earth-500" />
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
              className="flex-1 w-full p-4 border border-earth-300 rounded-xl focus:ring-2 focus:ring-nature-500 focus:border-transparent resize-none text-earth-800 bg-earth-50"
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
    </div>
  );
};

export default AnimalDetail;
