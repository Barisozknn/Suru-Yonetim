import React, { useState } from 'react';
import { Network, BarChart2, List, ShieldPlus, Dna, Search } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import PedigreeTree from '../components/PedigreeTree';
import BullsCatalog from '../components/genetics/BullsCatalog';
import GeneticScoreCard from '../components/genetics/GeneticScoreCard';
import MatingPlanner from '../components/genetics/MatingPlanner';
import HerdRanking from '../components/genetics/HerdRanking';

const PedigreePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'soyagaci' | 'profil' | 'siralamalar' | 'boga' | 'ciftlestirme'>('soyagaci');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-3 text-nature-800 dark:text-nature-200 border-b border-earth-200 dark:border-gray-700 pb-4">
        <Dna className="w-8 h-8" />
        <div>
          <h1 className="text-2xl font-black">Genetik ve Islah Merkezi</h1>
          <p className="text-earth-500 dark:text-gray-400">Sürü genetiğini analiz edin, damızlık seçimi yapın ve soy ağacını izleyin.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-earth-200 dark:border-gray-700 pb-2">
        <TabButton
          active={activeTab === 'soyagaci'}
          onClick={() => setActiveTab('soyagaci')}
          icon={<Network className="w-4 h-4" />}
          label="Soy Ağacı"
        />
        <TabButton
          active={activeTab === 'profil'}
          onClick={() => setActiveTab('profil')}
          icon={<BarChart2 className="w-4 h-4" />}
          label="Genetik Profil (TDİ)"
        />
        <TabButton
          active={activeTab === 'siralamalar'}
          onClick={() => setActiveTab('siralamalar')}
          icon={<List className="w-4 h-4" />}
          label="Sürü Damızlık Sıralaması"
        />
        <TabButton
          active={activeTab === 'boga'}
          onClick={() => setActiveTab('boga')}
          icon={<ShieldPlus className="w-4 h-4" />}
          label="Boğa Kataloğu"
        />
        <TabButton
          active={activeTab === 'ciftlestirme'}
          onClick={() => setActiveTab('ciftlestirme')}
          icon={<Dna className="w-4 h-4" />}
          label="Çiftleştirme Planlama"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700">
        {activeTab === 'soyagaci' && <PedigreeTreeTab />}
        {activeTab === 'profil' && <GeneticScoreCard />}
        {activeTab === 'siralamalar' && <HerdRanking />}
        {activeTab === 'boga' && <BullsCatalog />}
        {activeTab === 'ciftlestirme' && <MatingPlanner />}
      </div>
    </div>
  );
};

// Alt bileşen: Mevcut Soy Ağacı içeriği (eski PedigreePage içeriği)
const PedigreeTreeTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);

  // db ve useLiveFarmQuery zaten import edildi

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const selectedAnimal = hayvanlar.find((h: any) => h.id === selectedAnimalId);
  const filteredHayvanlar = hayvanlar.filter((h: any) =>
    h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto space-y-2 relative">
        <label className="text-sm font-bold text-earth-700 dark:text-gray-300">Hayvan Seç (Küpe No)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-earth-400" />
          <input
            type="text"
            placeholder="Küpe No ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-earth-200 dark:border-gray-700 rounded-xl focus:border-nature-500 focus:ring-0 transition dark:bg-gray-700 dark:text-white"
          />
        </div>

        {searchTerm && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {filteredHayvanlar.length > 0 ? (
              filteredHayvanlar.map((h: any) => (
                <div
                  key={h.id}
                  onClick={() => {
                    setSelectedAnimalId(h.id);
                    setSearchTerm('');
                  }}
                  className="p-3 hover:bg-earth-50 dark:hover:bg-gray-700 cursor-pointer border-b border-earth-100 dark:border-gray-700 last:border-0 flex justify-between items-center"
                >
                  <span className="font-bold text-earth-800 dark:text-gray-200">{h.kupeNo}</span>
                  <span className="text-sm text-earth-500 dark:text-gray-400">{h.irk} - {h.tur}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-earth-500 dark:text-gray-400 italic">Sonuç bulunamadı.</div>
            )}
          </div>
        )}
      </div>

      <div className="pt-6">
        {selectedAnimal ? (
          <div className="bg-nature-50/30 p-4 md:p-6 rounded-2xl border border-nature-200 dark:border-nature-800">
            <PedigreeTree
              hayvan={selectedAnimal}
              onSelectAnimal={(id: string) => setSelectedAnimalId(id)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-earth-400 bg-earth-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-earth-200 dark:border-gray-700">
            <Network className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-bold text-earth-500 dark:text-gray-400">Görüntülemek için bir hayvan seçin</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${active
        ? 'bg-nature-500 text-white shadow-sm'
        : 'bg-earth-100 dark:bg-gray-800 text-earth-600 dark:text-gray-400 hover:bg-earth-200 dark:hover:bg-gray-700'
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default PedigreePage;
