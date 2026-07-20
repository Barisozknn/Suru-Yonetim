import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { Search, Activity } from 'lucide-react';
import ReproductionSchedule from '../components/ReproductionSchedule';
import ReproductionTimeline from '../components/ReproductionTimeline';
import ReproductionModal from '../components/ReproductionModal';
import MaleReproductionTimeline from '../components/MaleReproductionTimeline';
import MaleReproductionModal from '../components/MaleReproductionModal';

const ReproductionManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  
  const filteredHayvanlar = searchTerm.length > 1 
    ? hayvanlar.filter(h => h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()) && (['İnek', 'Düve', 'Boğa', 'Tosun'].includes(h.tur)))
    : [];

  const selectedAnimal = hayvanlar.find(h => h.id === selectedAnimalId);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-earth-900 tracking-tight">Üreme Yönetimi</h1>
          <p className="text-earth-500 font-medium mt-1">Tohumlama, gebelik kontrolleri ve doğum takibi</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-earth-200 flex-shrink-0">
        <h2 className="text-lg font-bold text-earth-800 mb-3 flex items-center"><Search className="w-5 h-5 mr-2 text-earth-500"/> Hızlı İşlem (Hayvan Ara)</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Küpe numarası ile hayvan ara..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedAnimalId(null); }}
            className="w-full p-3 pl-10 border border-earth-300 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
          />
          <Search className="w-5 h-5 absolute left-3 top-3.5 text-earth-400" />
          
          {searchTerm.length > 1 && !selectedAnimalId && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-earth-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredHayvanlar.length === 0 ? (
                <div className="p-4 text-center text-earth-500">Uygun dişi hayvan bulunamadı</div>
              ) : (
                filteredHayvanlar.map(h => (
                  <div key={h.id} onClick={() => { setSelectedAnimalId(h.id); setSearchTerm(h.kupeNo); }} className="p-3 hover:bg-nature-50 cursor-pointer border-b border-earth-100 last:border-0 flex justify-between items-center">
                    <span className="font-bold text-earth-900">{h.kupeNo}</span>
                    <span className="text-sm text-earth-500">{h.tur} - {h.irk}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {selectedAnimal && (
          <div className="mt-4 pt-4 border-t border-earth-200">
             <div className="flex justify-between items-center mb-4">
                <div>
                   <h3 className="font-bold text-lg text-earth-900">{selectedAnimal.kupeNo} - Üreme Geçmişi</h3>
                   <p className="text-sm text-earth-500">{selectedAnimal.tur}</p>
                </div>
                <button onClick={() => setIsEventModalOpen(true)} className="bg-nature-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-nature-700 transition">
                  <Activity className="w-5 h-5 mr-2" /> Yeni Üreme Olayı Gir
                </button>
             </div>
             
             <div className="bg-earth-50 p-4 rounded-xl border border-earth-200 max-h-[400px] overflow-y-auto">
               {['Boğa', 'Tosun'].includes(selectedAnimal.tur) ? (
                 <MaleReproductionTimeline hayvan={selectedAnimal} />
               ) : (
                 <ReproductionTimeline hayvanId={selectedAnimal.id} />
               )}
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[500px]">
        <ReproductionSchedule />
      </div>

      {isEventModalOpen && selectedAnimal && (
        ['Boğa', 'Tosun'].includes(selectedAnimal.tur) ? (
          <MaleReproductionModal hayvan={selectedAnimal} onClose={() => setIsEventModalOpen(false)} />
        ) : (
          <ReproductionModal hayvanId={selectedAnimal.id} onClose={() => setIsEventModalOpen(false)} />
        )
      )}
    </div>
  );
};

export default ReproductionManagement;
