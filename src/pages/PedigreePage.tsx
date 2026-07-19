import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Network, Search } from 'lucide-react';
import PedigreeTree from '../components/PedigreeTree';

const PedigreePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  // Fetch all animals for the search/dropdown
  const hayvanlar = useLiveQuery(() => db.hayvanlar.toArray()) || [];
  
  // The currently selected animal to show tree for
  const selectedAnimal = hayvanlar.find(h => h.id === selectedAnimalId);

  // Filter animals based on search
  const filteredHayvanlar = hayvanlar.filter(h => 
    h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-3 text-nature-800 border-b border-earth-200 pb-4">
        <Network className="w-8 h-8" />
        <div>
          <h1 className="text-2xl font-black">Soy Ağacı Analizi</h1>
          <p className="text-earth-500">Sürüdeki hayvanların 3 nesil soy ağacını görüntüleyin</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6">
        {/* Arama ve Seçim Alanı */}
        <div className="max-w-xl mx-auto space-y-2 relative">
          <label className="text-sm font-bold text-earth-700">Hayvan Seç (Küpe No)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-earth-400" />
            <input 
              type="text" 
              placeholder="Küpe No ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-earth-200 rounded-xl focus:border-nature-500 focus:ring-0 transition"
            />
          </div>
          
          {searchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-earth-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredHayvanlar.length > 0 ? (
                filteredHayvanlar.map(h => (
                  <div 
                    key={h.id}
                    onClick={() => {
                      setSelectedAnimalId(h.id);
                      setSearchTerm('');
                    }}
                    className="p-3 hover:bg-earth-50 cursor-pointer border-b border-earth-100 last:border-0 flex justify-between items-center"
                  >
                    <span className="font-bold text-earth-800">{h.kupeNo}</span>
                    <span className="text-sm text-earth-500">{h.irk} - {h.tur}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-earth-500 italic">Sonuç bulunamadı.</div>
              )}
            </div>
          )}
        </div>

        {/* Soy Ağacı Gösterimi */}
        <div className="pt-6">
          {selectedAnimal ? (
            <div className="bg-nature-50/30 p-4 md:p-6 rounded-2xl border border-nature-200">
              <PedigreeTree 
                hayvan={selectedAnimal} 
                onSelectAnimal={(id) => setSelectedAnimalId(id)} 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-earth-400 bg-earth-50 rounded-2xl border-2 border-dashed border-earth-200">
              <Network className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-bold text-earth-500">Görüntülemek için bir hayvan seçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PedigreePage;
