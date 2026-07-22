import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { Search, Syringe, CalendarDays, Activity } from 'lucide-react';
import VaccineSchedule from '../components/VaccineSchedule';
import HealthTimeline from '../components/HealthTimeline';
import HealthEventModal from '../components/HealthEventModal';
import VaccineProtocolManager from '../components/VaccineProtocolManager';

const HealthManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Takvim' | 'Protokoller'>('Takvim');

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  
  const filteredHayvanlar = searchTerm.length > 1 
    ? hayvanlar.filter(h => h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const selectedAnimal = hayvanlar.find(h => h.id === selectedAnimalId);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-earth-900 dark:text-gray-100 tracking-tight">Sağlık Yönetimi</h1>
          <p className="text-earth-500 dark:text-gray-400 font-medium text-sm sm:text-base mt-0.5">Aşı takibi, muayeneler ve protokoller</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex-shrink-0 relative">
        <h2 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-3 flex items-center"><Search className="w-5 h-5 mr-2 text-earth-500 dark:text-gray-400"/> Hızlı İşlem (Hayvan Ara)</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Küpe numarası ile hayvan ara..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedAnimalId(null); }}
            className="w-full p-3 pl-10 border border-earth-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none font-medium"
          />
          <Search className="w-5 h-5 absolute left-3 top-3.5 text-earth-400" />
          
          {searchTerm.length > 1 && !selectedAnimalId && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {filteredHayvanlar.length === 0 ? (
                <div className="p-4 text-center text-earth-500 dark:text-gray-400">Hayvan bulunamadı</div>
              ) : (
                filteredHayvanlar.map(h => (
                  <div key={h.id} onClick={() => { setSelectedAnimalId(h.id); setSearchTerm(h.kupeNo); }} className="p-3 hover:bg-nature-50 dark:hover:bg-nature-900/30 cursor-pointer border-b border-earth-100 dark:border-gray-700 last:border-0 flex justify-between items-center">
                    <span className="font-bold text-earth-900 dark:text-gray-100">{h.kupeNo}</span>
                    <span className="text-sm text-earth-500 dark:text-gray-400">{h.tur} - {h.irk}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {selectedAnimal && (
          <div className="mt-4 pt-4 border-t border-earth-200 dark:border-gray-700">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                   <h3 className="font-bold text-lg text-earth-900 dark:text-gray-100">{selectedAnimal.kupeNo} - Sağlık Geçmişi</h3>
                   <p className="text-sm text-earth-500 dark:text-gray-400">{selectedAnimal.tur} &bull; {selectedAnimal.cinsiyet}</p>
                </div>
                <button onClick={() => setIsEventModalOpen(true)} className="bg-nature-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center hover:bg-nature-700 transition w-full sm:w-auto">
                  <Activity className="w-5 h-5 mr-2" /> Yeni İşlem Gir
                </button>
             </div>
             
             <div className="bg-earth-50 dark:bg-gray-900 p-4 rounded-xl border border-earth-200 dark:border-gray-700 max-h-64 overflow-y-auto">
               <HealthTimeline hayvanId={selectedAnimal.id} />
             </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-earth-200 dark:border-gray-700 pb-2 flex-shrink-0">
         <button onClick={() => setActiveTab('Takvim')} className={`px-4 py-2 rounded-lg font-bold flex items-center transition ${activeTab === 'Takvim' ? 'bg-earth-800 text-white' : 'bg-white dark:bg-gray-800 text-earth-600 dark:text-gray-400 hover:bg-earth-100 dark:hover:bg-gray-700 border border-earth-200 dark:border-gray-700'}`}>
           <CalendarDays className="w-5 h-5 mr-2" /> Aşı Takvimi
         </button>
         <button onClick={() => setActiveTab('Protokoller')} className={`px-4 py-2 rounded-lg font-bold flex items-center transition ${activeTab === 'Protokoller' ? 'bg-earth-800 text-white' : 'bg-white dark:bg-gray-800 text-earth-600 dark:text-gray-400 hover:bg-earth-100 dark:hover:bg-gray-700 border border-earth-200 dark:border-gray-700'}`}>
           <Syringe className="w-5 h-5 mr-2" /> Aşı Protokolleri
         </button>
      </div>

      <div className="flex-1 min-h-[500px]">
        {activeTab === 'Takvim' ? <VaccineSchedule /> : <VaccineProtocolManager />}
      </div>

      {isEventModalOpen && selectedAnimal && (
        <HealthEventModal hayvanId={selectedAnimal.id} onClose={() => setIsEventModalOpen(false)} />
      )}
    </div>
  );
};

export default HealthManagement;
