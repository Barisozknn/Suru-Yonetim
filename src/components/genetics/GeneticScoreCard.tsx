import React, { useState, useMemo } from 'react';
import { Search, Info } from 'lucide-react';
import { useLiveFarmQuery } from '../../hooks/useLiveFarmQuery';
import { db } from '../../lib/db';
import { useStore } from '../../store/useStore';
import { 
  calculateMilkTDI, 
  calculateGrowthTDI, 
  calculateHealthTDI,
  calculateOverallTDI,
  calcHerdMilkAvg,
  calcHerdADGAvg
} from '../../utils/geneticScoring';

const GeneticScoreCard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  
  const isletmeTipi = useStore(state => state.isletmeTipi);

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray()) || [];
  const saglikOlaylari = useLiveFarmQuery(() => db.saglikOlaylari.toArray()) || [];

  const filteredHayvanlar = hayvanlar.filter(h => 
    (h.tur === 'İnek' || h.tur === 'Boğa') && 
    h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedAnimal = hayvanlar.find(h => h.id === selectedAnimalId);

  const tdiResult = useMemo(() => {
    if (!selectedAnimal) return null;

    const suruOrtSut = calcHerdMilkAvg(sutKayitlari);
    const suruOrtADG = calcHerdADGAvg(agirlikKayitlari, hayvanlar);

    const sutSkoru = calculateMilkTDI(selectedAnimal, sutKayitlari, suruOrtSut);
    const buyumeSkoru = calculateGrowthTDI(selectedAnimal, agirlikKayitlari, suruOrtADG);
    const saglikSkoru = calculateHealthTDI(selectedAnimal, saglikOlaylari);
    
    const overall = calculateOverallTDI(sutSkoru, buyumeSkoru, saglikSkoru, isletmeTipi);

    return { sutSkoru, buyumeSkoru, saglikSkoru, overall };
  }, [selectedAnimal, sutKayitlari, agirlikKayitlari, saglikOlaylari, isletmeTipi, hayvanlar]);

  return (
    <div className="space-y-6">
      {/* Şeffaflık Notu */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p>
            <strong>TDİ (Tahmini Damızlık İndeksi) Nedir?</strong> Bu değerler, ham ölçümlerin sürü ortalamasına göre sapmaları bulunup kalıtım derecesi (h²) ile ölçeklendirilmesiyle elde edilen bir <strong>genetik tahmindir</strong>.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 ml-1 text-blue-700 dark:text-blue-300">
            <li><strong>Dişiler (İnek/Düve):</strong> Süt, Büyüme ve Sağlık skorları doğrudan hayvanın <strong>kendi verileri</strong> üzerinden sürü ortalamasına kıyasla hesaplanır.</li>
            <li><strong>Erkekler (Boğa/Tosun):</strong> Erkeklerin kendi süt verimi olmadığı için <strong>Süt Skoru nötr (50)</strong> kabul edilir. Bir boğanın asıl süt aktarım gücü <strong>"Boğa Kataloğu"</strong> sekmesindeki Yavru Testi (kızlarının verimi) ile ölçülür. Büyüme ve Sağlık skorları ise kendi verilerinden hesaplanır.</li>
          </ul>
        </div>
      </div>

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
              filteredHayvanlar.map(h => (
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

      {selectedAnimal && tdiResult && (
        <div className="bg-earth-50 dark:bg-gray-700 p-6 rounded-2xl border border-earth-200 dark:border-gray-600">
          <div className="flex justify-between items-end mb-6 border-b border-earth-200 dark:border-gray-600 pb-4">
            <div>
              <h2 className="text-2xl font-black text-earth-900 dark:text-white">{selectedAnimal.kupeNo}</h2>
              <p className="text-earth-600 dark:text-gray-300">{selectedAnimal.irk} - {selectedAnimal.tur}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-nature-600">{tdiResult.overall.toFixed(1)}</div>
              <p className="text-sm font-bold text-earth-500 dark:text-gray-400">Genel TDİ Skor (0-100)</p>
            </div>
          </div>

          <div className="space-y-6">
            <ScoreBar label="Süt Verimi" score={tdiResult.sutSkoru.normalizedSkor} guven={tdiResult.sutSkoru.guvenilirlik} veriSayisi={tdiResult.sutSkoru.veriSayisi} color="bg-blue-500" />
            <ScoreBar label="Büyüme (ADG)" score={tdiResult.buyumeSkoru.normalizedSkor} guven={tdiResult.buyumeSkoru.guvenilirlik} veriSayisi={tdiResult.buyumeSkoru.veriSayisi} color="bg-green-500" />
            <ScoreBar label="Sağlık Direnci" score={tdiResult.saglikSkoru.normalizedSkor} guven={tdiResult.saglikSkoru.guvenilirlik} veriSayisi={tdiResult.saglikSkoru.veriSayisi} color="bg-red-500" />
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreBar = ({ label, score, guven, veriSayisi, color }: { label: string; score: number; guven: number; veriSayisi: number; color: string }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <span className="font-bold text-earth-900 dark:text-white">{label}</span>
          <span className="ml-2 text-xs text-earth-500 dark:text-gray-400">Güvenilirlik: %{guven} ({veriSayisi} veri)</span>
        </div>
        <span className="font-black text-lg">{score.toFixed(1)}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
        <div className={`h-4 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }}></div>
      </div>
    </div>
  );
};

export default GeneticScoreCard;
