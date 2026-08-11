import React, { useState } from 'react';
import { Calculator, Droplets, Beef } from 'lucide-react';
import { useStore } from '../store/useStore';

const BreakevenCalculator: React.FC = () => {
  const globalSutFiyati = useStore(state => state.sutLitreFiyati);
  const globalCanliKiloFiyatlari = useStore(state => state.canliKiloFiyatlari);
  const isletmeTipi = useStore(state => state.isletmeTipi);

  const [hesapTipi, setHesapTipi] = useState<'sut' | 'besi'>(isletmeTipi === 'Besi' ? 'besi' : 'sut');

  const [sutFiyati, setSutFiyati] = useState<number>(globalSutFiyati);
  const [canliKiloFiyati, setCanliKiloFiyati] = useState<number>(globalCanliKiloFiyatlari?.['Dana'] || 300);
  
  const [yemMaliyeti, setYemMaliyeti] = useState<number>(150);
  const [digerGiderler, setDigerGiderler] = useState<number>(20); // Günlük sabit giderler (sağlık, işçilik vb.)

  const basabasLitre = sutFiyati > 0 ? (yemMaliyeti + digerGiderler) / sutFiyati : 0;
  const basabasKilo = canliKiloFiyati > 0 ? (yemMaliyeti + digerGiderler) / canliKiloFiyati : 0;
  
  // Örnek net kar fonksiyonları
  const getNetKarSut = (litre: number) => (litre * sutFiyati) - (yemMaliyeti + digerGiderler);
  const getNetKarBesi = (kg: number) => (kg * canliKiloFiyati) - (yemMaliyeti + digerGiderler);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 max-w-4xl mx-auto mt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-earth-200 dark:border-gray-700 pb-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-earth-900 dark:text-gray-100">Başabaş (Breakeven) Noktası Hesaplayıcı</h2>
            <p className="text-sm text-earth-500 dark:text-gray-400">Günlük maliyetleri çıkarmak için gereken minimum verimi bulun.</p>
          </div>
        </div>

        <div className="flex bg-earth-100 dark:bg-gray-700 p-1 rounded-lg">
          <button 
            onClick={() => setHesapTipi('sut')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold transition ${hesapTipi === 'sut' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-earth-500 dark:text-gray-400'}`}
          >
            <Droplets className="w-4 h-4" />
            <span>Süt</span>
          </button>
          <button 
            onClick={() => setHesapTipi('besi')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-bold transition ${hesapTipi === 'besi' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' : 'text-earth-500 dark:text-gray-400'}`}
          >
            <Beef className="w-4 h-4" />
            <span>Besi</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {hesapTipi === 'sut' ? (
            <div>
              <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Süt Litre Fiyatı (₺)</label>
              <input 
                type="number" 
                value={sutFiyati} 
                onChange={e => setSutFiyati(Number(e.target.value))}
                className="w-full p-3 border border-earth-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Canlı Kilo Fiyatı (₺)</label>
              <input 
                type="number" 
                value={canliKiloFiyati} 
                onChange={e => setCanliKiloFiyati(Number(e.target.value))}
                className="w-full p-3 border border-earth-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Hayvan Başı Günlük Yem Maliyeti (₺)</label>
            <input 
              type="number" 
              value={yemMaliyeti} 
              onChange={e => setYemMaliyeti(Number(e.target.value))}
              className="w-full p-3 border border-earth-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Günlük Diğer Giderler (İşçilik, Elektrik vb.) (₺)</label>
            <input 
              type="number" 
              value={digerGiderler} 
              onChange={e => setDigerGiderler(Number(e.target.value))}
              className="w-full p-3 border border-earth-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="bg-earth-50 dark:bg-gray-900 rounded-xl p-6 border border-earth-200 dark:border-gray-700 flex flex-col justify-center items-center text-center">
          <p className="text-sm font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider mb-2">Başabaş Noktası (Sıfır Kar)</p>
          <div className="flex items-baseline space-x-2">
            {hesapTipi === 'sut' ? (
              <>
                <span className="text-5xl font-black text-blue-600 dark:text-blue-400">{basabasLitre.toFixed(1)}</span>
                <span className="text-xl font-bold text-earth-600 dark:text-gray-400">Litre / Gün</span>
              </>
            ) : (
              <>
                <span className="text-5xl font-black text-orange-600 dark:text-orange-400">{basabasKilo.toFixed(2)}</span>
                <span className="text-xl font-bold text-earth-600 dark:text-gray-400">Kg / Gün</span>
              </>
            )}
          </div>
          <p className="text-sm text-earth-500 dark:text-gray-400 mt-4 max-w-xs mx-auto">
            {hesapTipi === 'sut' 
              ? `Bir ineğin sadece günlük masrafını karşılayabilmesi için günde en az ${basabasLitre.toFixed(1)} litre süt vermesi gerekmektedir.`
              : `Bir besi hayvanının günlük masrafını karşılayabilmesi için günde en az ${basabasKilo.toFixed(2)} kg canlı ağırlık kazanması (karkas randımanı hesaba katılmadan) gerekmektedir.`}
          </p>
        </div>
      </div>

      <div className="mt-8 border-t border-earth-200 dark:border-gray-700 pt-6">
        <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-4">What-If (Ne Olurdu?) Senaryoları</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {hesapTipi === 'sut' ? (
            [20, 25, 30, 35].map(hedefLitre => {
              const kar = getNetKarSut(hedefLitre);
              return (
                <div key={hedefLitre} className={`p-4 rounded-xl border flex flex-col items-center text-center ${kar >= 0 ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                  <span className="text-sm font-bold text-earth-600 dark:text-gray-400">{hedefLitre} Litre Verirse</span>
                  <span className={`text-xl font-black mt-1 ${kar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kar >= 0 ? '+' : ''}{kar.toFixed(1)} ₺
                  </span>
                  <span className="text-xs text-earth-500 dark:text-gray-400 mt-1">Günlük Net Kâr</span>
                </div>
              );
            })
          ) : (
            [0.8, 1.0, 1.2, 1.5].map(hedefKilo => {
              const kar = getNetKarBesi(hedefKilo);
              return (
                <div key={hedefKilo} className={`p-4 rounded-xl border flex flex-col items-center text-center ${kar >= 0 ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                  <span className="text-sm font-bold text-earth-600 dark:text-gray-400">{hedefKilo} kg Alırsa</span>
                  <span className={`text-xl font-black mt-1 ${kar >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kar >= 0 ? '+' : ''}{kar.toFixed(1)} ₺
                  </span>
                  <span className="text-xs text-earth-500 dark:text-gray-400 mt-1">Günlük Net Kâr</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BreakevenCalculator;
