import React, { useState, useMemo } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { Flame, Syringe, CheckCircle, Droplets, Calendar, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { PiCow } from 'react-icons/pi';

const ReproductionStatusReport: React.FC = () => {
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];

  const [activeTab, setActiveTab] = useState<'Kizginlik' | 'Tohumlama' | 'Gebelik' | 'Kuru' | 'Dogum'>('Kizginlik');
  const [dogumGunuFilter, setDogumGunuFilter] = useState<7 | 15 | 30>(7);
  const [expandedAnimalId, setExpandedAnimalId] = useState<string | null>(null);

  const lists = useMemo(() => {
    const disiHayvanlar = hayvanlar.filter(h => ['İnek', 'Düve'].includes(h.tur) && h.durum === 'Aktif');
    
    const kizginlikList: any[] = [];
    const tohumlamaList: any[] = [];
    const gebelikList: any[] = [];
    const kuruList: any[] = [];
    const dogumList: any[] = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    disiHayvanlar.forEach(hayvan => {
      // Hayvana ait tüm kayıtlar tarihe göre sondan başa sıralı
      const records = uremeKayitlari
        .filter(k => k.hayvanId === hayvan.id)
        .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

      if (records.length > 0) {
        const lastRecord = records[0];

        switch (lastRecord.tur) {
          case 'Kızgınlık':
            kizginlikList.push({ hayvan, record: lastRecord });
            break;
          case 'Tohumlama/Aşım':
          case 'Doğal Aşım':
            tohumlamaList.push({ hayvan, record: lastRecord });
            break;
          case 'Gebelik Kontrolü':
            gebelikList.push({ hayvan, record: lastRecord });
            break;
          case 'Kuruya Çıkarma':
            kuruList.push({ hayvan, record: lastRecord });
            break;
        }
      }

      // Doğum yapanlar için en son 'Doğum' kaydını bulalım (son işlem olması şart değil)
      const lastDogum = records.find(k => k.tur === 'Doğum');
      if (lastDogum) {
        const dogumTarihi = new Date(lastDogum.tarih);
        dogumTarihi.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((now.getTime() - dogumTarihi.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 0 && diffDays <= dogumGunuFilter) {
          dogumList.push({ hayvan, record: lastDogum, diffDays });
        }
      }
    });

    return { kizginlikList, tohumlamaList, gebelikList, kuruList, dogumList };
  }, [hayvanlar, uremeKayitlari, dogumGunuFilter]);

  const toggleExpand = (id: string) => {
    setExpandedAnimalId(prev => prev === id ? null : id);
  };

  const renderList = (items: any[], emptyMessage: string) => {
    if (items.length === 0) {
      return <div className="text-center p-6 text-earth-500 dark:text-gray-400 bg-earth-50/50 dark:bg-gray-900/30 rounded-xl border border-earth-100 dark:border-gray-800">{emptyMessage}</div>;
    }
    
    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all hover:border-nature-300 dark:hover:border-nature-700">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer select-none"
              onClick={() => toggleExpand(item.hayvan.id)}
            >
              <div className="flex items-center gap-4">
                <div>
                  <h4 className="font-bold text-earth-900 dark:text-gray-100">{item.hayvan.kupeNo}</h4>
                  <p className="text-sm text-earth-500 dark:text-gray-400">
                    İşlem Tarihi: {new Date(item.record.tarih).toLocaleDateString('tr-TR')} 
                    {item.diffDays !== undefined && ` (${item.diffDays} gün önce)`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.record.durum && (
                   <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.record.durum === 'Gebe' ? 'bg-green-100 text-green-700' : item.record.durum === 'Boş' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                     {item.record.durum}
                   </span>
                )}
                {expandedAnimalId === item.hayvan.id ? <ChevronDown className="w-5 h-5 text-earth-400" /> : <ChevronRight className="w-5 h-5 text-earth-400" />}
              </div>
            </div>
            {expandedAnimalId === item.hayvan.id && (
              <div className="p-4 bg-earth-50 dark:bg-gray-900 border-t border-earth-100 dark:border-gray-800 text-sm space-y-2">
                <p><span className="font-bold text-earth-700 dark:text-gray-300">İşlem Türü:</span> {item.record.tur}</p>
                {item.record.notlar && <p><span className="font-bold text-earth-700 dark:text-gray-300">Notlar:</span> {item.record.notlar}</p>}
                {item.record.detaylar?.spermaBogaBilgisi && <p><span className="font-bold text-earth-700 dark:text-gray-300">Boğa/Sperma:</span> {item.record.detaylar.spermaBogaBilgisi}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden flex flex-col mt-6">
      <div className="p-4 sm:p-5 border-b border-earth-200 dark:border-gray-700">
         <h2 className="text-lg font-bold text-earth-800 dark:text-gray-200 flex items-center">
           <Activity className="w-5 h-5 mr-2 text-nature-600" />
           Aktif Üreme Durum Raporları
         </h2>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar border-b border-earth-200 dark:border-gray-700">
        <button 
          onClick={() => setActiveTab('Kizginlik')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'Kizginlik' ? 'text-nature-600 border-b-2 border-nature-600 bg-nature-50 dark:bg-nature-900/20' : 'text-earth-500 hover:text-earth-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <Flame className="w-4 h-4" /> Kızgınlık
          <span className="ml-1 bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full text-xs">{lists.kizginlikList.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Tohumlama')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'Tohumlama' ? 'text-nature-600 border-b-2 border-nature-600 bg-nature-50 dark:bg-nature-900/20' : 'text-earth-500 hover:text-earth-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <Syringe className="w-4 h-4" /> Tohumlanan
          <span className="ml-1 bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full text-xs">{lists.tohumlamaList.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Gebelik')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'Gebelik' ? 'text-nature-600 border-b-2 border-nature-600 bg-nature-50 dark:bg-nature-900/20' : 'text-earth-500 hover:text-earth-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <CheckCircle className="w-4 h-4" /> Gebelik Kontrolü
          <span className="ml-1 bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full text-xs">{lists.gebelikList.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Kuru')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'Kuru' ? 'text-nature-600 border-b-2 border-nature-600 bg-nature-50 dark:bg-nature-900/20' : 'text-earth-500 hover:text-earth-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <Droplets className="w-4 h-4" /> Kuruya Çıkarılan
          <span className="ml-1 bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full text-xs">{lists.kuruList.length}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Dogum')}
          className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'Dogum' ? 'text-nature-600 border-b-2 border-nature-600 bg-nature-50 dark:bg-nature-900/20' : 'text-earth-500 hover:text-earth-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          <PiCow className="w-4 h-4" /> Doğum Yapan
          <span className="ml-1 bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full text-xs">{lists.dogumList.length}</span>
        </button>
      </div>

      <div className="p-4 sm:p-5 bg-earth-50/30 dark:bg-gray-900/20">
        {activeTab === 'Dogum' && (
           <div className="flex items-center justify-end mb-4 bg-white dark:bg-gray-800 p-2 rounded-xl border border-earth-200 dark:border-gray-700 w-fit ml-auto">
             <Calendar className="w-4 h-4 text-earth-500 mr-2" />
             <span className="text-sm text-earth-600 dark:text-gray-300 mr-2 font-medium">Zaman Aralığı:</span>
             <select 
               value={dogumGunuFilter} 
               onChange={(e) => setDogumGunuFilter(Number(e.target.value) as 7|15|30)}
               className="text-sm bg-earth-100 dark:bg-gray-700 text-earth-800 dark:text-gray-100 border-none rounded-lg focus:ring-0 cursor-pointer font-bold py-1"
             >
               <option value={7}>Son 7 Gün</option>
               <option value={15}>Son 15 Gün</option>
               <option value={30}>Son 1 Ay</option>
             </select>
           </div>
        )}

        {activeTab === 'Kizginlik' && renderList(lists.kizginlikList, "Son durumu kızgınlık olan hayvan bulunmuyor.")}
        {activeTab === 'Tohumlama' && renderList(lists.tohumlamaList, "Son durumu tohumlanmış olan hayvan bulunmuyor.")}
        {activeTab === 'Gebelik' && renderList(lists.gebelikList, "Son durumu gebelik kontrolü olan hayvan bulunmuyor.")}
        {activeTab === 'Kuru' && renderList(lists.kuruList, "Son durumu kuruya çıkarılmış olan hayvan bulunmuyor.")}
        {activeTab === 'Dogum' && renderList(lists.dogumList, `Son ${dogumGunuFilter} gün içinde doğum yapan hayvan bulunmuyor.`)}
      </div>
    </div>
  );
};

export default ReproductionStatusReport;
