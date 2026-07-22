import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplet, TrendingUp, Activity, Award, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import MilkRecords from '../components/MilkRecords';
import WeightRecords from '../components/WeightRecords';

const YieldAnalysis: React.FC = () => {
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray()) || [];
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  const [timeFilter, setTimeFilter] = useState<'7' | '30' | '365' | 'all'>('30');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const filteredHayvanlar = searchTerm.length > 1 
    ? hayvanlar.filter(h => h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const selectedAnimal = hayvanlar.find(h => h.id === selectedAnimalId);

  // Filtreleme Mantığı
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  let targetDate: Date | null = null;
  
  if (timeFilter !== 'all') {
    targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - parseInt(timeFilter));
    targetDate.setHours(0, 0, 0, 0);
  }

  const targetHayvanIds = new Set(
    groupFilter === 'all' 
      ? hayvanlar.map(h => h.id) 
      : hayvanlar.filter(h => h.grupId === groupFilter).map(h => h.id)
  );

  const filteredSutKayitlari = sutKayitlari.filter(k => 
    targetHayvanIds.has(k.hayvanId) && 
    (!targetDate || new Date(k.tarih) >= targetDate)
  );

  // 1. Süt Eğrisi ve Toplamlar
  let toplamSut = 0;
  const gunlukSut: Record<string, number> = {};
  
  filteredSutKayitlari.forEach(k => {
    toplamSut += k.litre;
    const d = new Date(k.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    gunlukSut[d] = (gunlukSut[d] || 0) + k.litre;
  });

  const sutGrafikVerisi = Object.keys(gunlukSut)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .map(tarih => ({ tarih, toplam: gunlukSut[tarih] }));

  // Günlük Ortalama (Sadece kayıt olan günler)
  const gunSayisi = sutGrafikVerisi.length > 0 ? sutGrafikVerisi.length : 1;
  const gunlukOrtalamaSut = toplamSut / gunSayisi;

  // 2. En yüksek verimli 5 inek (Seçili Periyot ve Grupta)
  const inekSutOrtalamalari: Record<string, { toplam: number, sayi: number }> = {};
  filteredSutKayitlari.forEach(k => {
    if (!inekSutOrtalamalari[k.hayvanId]) inekSutOrtalamalari[k.hayvanId] = { toplam: 0, sayi: 0 };
    inekSutOrtalamalari[k.hayvanId].toplam += k.litre;
    inekSutOrtalamalari[k.hayvanId].sayi += 1;
  });

  const sampiyonlar = Object.entries(inekSutOrtalamalari)
    .map(([id, val]) => {
      const h = hayvanlar.find(x => x.id === id);
      return { id, kupeNo: h ? h.kupeNo : 'Bilinmeyen', ortalama: val.toplam / val.sayi };
    })
    .sort((a, b) => b.ortalama - a.ortalama)
    .slice(0, 5);

  // 3. ADG Hesabı (Seçili Gruptaki Hayvanlar)
  let toplamADG = 0;
  let hesaplanabilenHayvanSayisi = 0;

  Array.from(targetHayvanIds).forEach(hid => {
    const hKayitlar = agirlikKayitlari
      .filter(a => a.hayvanId === hid)
      .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
    
    if (hKayitlar.length >= 2) {
      const ilk = hKayitlar[0];
      const son = hKayitlar[hKayitlar.length - 1];
      const gunFarki = (new Date(son.tarih).getTime() - new Date(ilk.tarih).getTime()) / (1000 * 3600 * 24);
      if (gunFarki > 0) {
        toplamADG += (son.kg - ilk.kg) / gunFarki;
        hesaplanabilenHayvanSayisi++;
      }
    }
  });

  const suruOrtalamaADG = hesaplanabilenHayvanSayisi > 0 ? (toplamADG / hesaplanabilenHayvanSayisi) : 0;

  if (hayvanlar.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="p-6 bg-earth-100 rounded-full text-earth-400">
          <Activity className="w-16 h-16" />
        </div>
        <h2 className="text-2xl font-black text-earth-900">Sürü Verisi Yok</h2>
        <p className="text-earth-500">Analiz yapabilmek için lütfen önce hayvan ekleyin.</p>
        <Link to="/hayvanlar" className="px-6 py-3 bg-nature-600 text-white rounded-xl font-bold mt-4 hover:bg-nature-700 transition">
          Hayvan Listesine Git
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-earth-900 tracking-tight">Süt & Ağırlık Özet</h1>
          <p className="text-earth-500 font-medium text-sm sm:text-base mt-0.5">Sürü verim analizi ve bireysel hayvan kayıtları</p>
        </div>
      </div>

      {!selectedAnimalId ? (
        <>
          {/* Hızlı İşlem Arama */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-earth-200 flex-shrink-0 relative">
            <h2 className="text-lg font-bold text-earth-800 mb-3 flex items-center"><Search className="w-5 h-5 mr-2 text-earth-500"/> Bireysel Verim Girişi (Hayvan Ara)</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Küpe numarası ile hayvan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-earth-50 border-none rounded-xl focus:ring-2 focus:ring-nature-500 font-medium"
              />
              <Search className="w-5 h-5 text-earth-400 absolute left-3 top-3.5" />
            </div>

            {searchTerm.length > 1 && (
              <div className="mt-2 border border-earth-100 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto shadow-xl absolute left-4 right-4 z-20">
                {filteredHayvanlar.length === 0 ? (
                  <div className="p-4 text-center text-earth-500 text-sm">Hayvan bulunamadı.</div>
                ) : (
                  filteredHayvanlar.map(h => (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedAnimalId(h.id);
                        setSearchTerm('');
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-nature-50 border-b last:border-0 border-earth-100 transition-colors text-left"
                    >
                      <div>
                        <span className="font-bold text-earth-900 block">{h.kupeNo}</span>
                        <span className="text-xs text-earth-500">{h.tur} • {h.cinsiyet}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-nature-400" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Filtreleme Paneli */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-earth-200 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-earth-500 mb-1 uppercase">Sürü Grubu</label>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl font-bold text-earth-900 focus:ring-2 focus:ring-nature-500"
              >
                <option value="all">Tüm Sürü</option>
                {gruplar.map(g => (
                  <option key={g.id} value={g.id}>{g.ad}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-earth-500 mb-1 uppercase">Zaman Aralığı</label>
              <select
                value={timeFilter}
                onChange={(e: any) => setTimeFilter(e.target.value)}
                className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl font-bold text-earth-900 focus:ring-2 focus:ring-nature-500"
              >
                <option value="7">Son 7 Gün (Günlük)</option>
                <option value="30">Son 30 Gün (Aylık)</option>
                <option value="365">Son 1 Yıl (Yıllık)</option>
                <option value="all">Tüm Zamanlar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* KPI KARTLARI */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
            <Droplet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">Toplam Süt</p>
            <p className="text-3xl font-black text-earth-900">
              {toplamSut.toLocaleString('tr-TR')} <span className="text-base font-normal">Lt</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className="p-4 bg-nature-100 text-nature-600 rounded-xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">Sürü Günlük Ort. Süt</p>
            <p className="text-3xl font-black text-earth-900">
              {gunlukOrtalamaSut.toLocaleString('tr-TR', {maximumFractionDigits: 1})} <span className="text-base font-normal">Lt/Gün</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 flex items-center space-x-4">
          <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 uppercase">Ortalama GCAA</p>
            <p className="text-3xl font-black text-earth-900">
              {suruOrtalamaADG > 0 ? suruOrtalamaADG.toFixed(2) : '-'} <span className="text-base font-normal">Kg/Gün</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAFİK */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-earth-200">
          <h3 className="text-lg font-bold text-earth-900 mb-6">Süt Üretim Eğrisi ({timeFilter === 'all' ? 'Tüm Zamanlar' : `Son ${timeFilter} Gün`})</h3>
          {sutGrafikVerisi.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sutGrafikVerisi}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="tarih" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} Lt`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${value} Litre`, 'Toplam Süt']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="toplam" 
                    stroke="#2563eb" 
                    strokeWidth={4}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex items-center justify-center text-earth-400 font-bold bg-earth-50 rounded-xl">
               Yeterli süt kaydı bulunamadı.
             </div>
          )}
        </div>

        {/* ŞAMPİYONLAR */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200">
          <div className="flex items-center space-x-2 mb-6">
            <Award className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-bold text-earth-900">En Yüksek Verim (Ortalama)</h3>
          </div>
          
          {sampiyonlar.length > 0 ? (
            <div className="space-y-4">
              {sampiyonlar.map((inek, idx) => (
                <div key={inek.id} className="flex items-center justify-between p-3 bg-nature-50 rounded-xl border border-nature-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-nature-200 flex items-center justify-center font-black text-nature-700 text-sm">
                      {idx + 1}
                    </div>
                    <Link to={`/hayvanlar?id=${inek.id}&tab=verim`} className="font-bold text-earth-900 hover:text-nature-600 transition">
                      {inek.kupeNo}
                    </Link>
                  </div>
                  <div className="font-black text-nature-700">
                    {inek.ortalama.toFixed(1)} <span className="text-xs text-nature-500 font-normal">Lt/Gün</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-earth-400 font-medium">
              Son 7 güne ait süt kaydı bulunamadı.
            </div>
          )}
        </div>

        </div>
        </>
      ) : (
        /* BİREYSEL HAYVAN VERİM GİRİŞİ */
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-earth-200 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-earth-100 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setSelectedAnimalId(null)}
                className="p-2 bg-earth-100 hover:bg-earth-200 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-earth-700" />
              </button>
              <div>
                <h2 className="text-xl font-black text-earth-900">{selectedAnimal?.kupeNo} - Verim Kayıtları</h2>
                <p className="text-sm text-earth-500">{selectedAnimal?.tur} • {selectedAnimal?.irk}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-6 overflow-y-auto pr-2 pb-4">
            {['İnek', 'Düve'].includes(selectedAnimal?.tur || '') && (
              <div className="bg-white rounded-2xl border border-earth-200 overflow-hidden shadow-sm p-2">
                 <MilkRecords hayvan={selectedAnimal!} />
              </div>
            )}
            <div className="bg-white rounded-2xl border border-earth-200 overflow-hidden shadow-sm p-2">
               <WeightRecords hayvan={selectedAnimal!} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YieldAnalysis;
