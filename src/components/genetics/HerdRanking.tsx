import React, { useMemo, useState } from 'react';
import { useLiveFarmQuery } from '../../hooks/useLiveFarmQuery';
import { db } from '../../lib/db';
import { useStore } from '../../store/useStore';
import { 
  calculateMilkTDI, 
  calculateGrowthTDI, 
  calculateHealthTDI,
  calculateOverallTDI,
  calcHerdMilkAvg,
  calcHerdMilkStdDev,
  calcHerdADGAvg,
  calcHerdADGStdDev,
  calcHerdHealthAvg,
  calcHerdHealthStdDev,
  calcHerdFertilityAvg,
  calcHerdFertilityStdDev,
  calculateFertilityTDI
} from '../../utils/geneticScoring';
import { Trophy, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const HerdRanking: React.FC = () => {
  const isletmeTipi = useStore(state => state.isletmeTipi);

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray()) || [];
  const saglikOlaylari = useLiveFarmQuery(() => db.saglikOlaylari.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];

  const [filterTur, setFilterTur] = useState<'Tümü' | 'İnek' | 'Boğa'>('İnek');

  const ranking = useMemo(() => {
    if (hayvanlar.length === 0) return [];

    const suruOrtSut = calcHerdMilkAvg(sutKayitlari);
    const suruStdSut = calcHerdMilkStdDev(sutKayitlari, suruOrtSut);
    
    const suruOrtADG = calcHerdADGAvg(agirlikKayitlari, hayvanlar);
    const suruStdADG = calcHerdADGStdDev(agirlikKayitlari, hayvanlar, suruOrtADG);
    
    const suruOrtSaglik = calcHerdHealthAvg(saglikOlaylari, hayvanlar);
    const suruStdSaglik = calcHerdHealthStdDev(saglikOlaylari, hayvanlar, suruOrtSaglik);
    
    const suruOrtCR = calcHerdFertilityAvg(uremeKayitlari);
    const suruStdCR = calcHerdFertilityStdDev(uremeKayitlari, hayvanlar, suruOrtCR);

    const list = hayvanlar
      // SADECE İnek ve Boğa damızlık olarak göster
      .filter(h => h.durum === 'Aktif' && (h.tur === 'İnek' || h.tur === 'Boğa') && (filterTur === 'Tümü' || h.tur === filterTur))
      .map(hayvan => {
        const sutSkoru = calculateMilkTDI(hayvan, sutKayitlari, suruOrtSut, suruStdSut, hayvanlar, uremeKayitlari);
        const buyumeSkoru = calculateGrowthTDI(hayvan, agirlikKayitlari, suruOrtADG, suruStdADG);
        const saglikSkoru = calculateHealthTDI(hayvan, saglikOlaylari, suruOrtSaglik, suruStdSaglik);
        const uremeSkoru = calculateFertilityTDI(hayvan, uremeKayitlari, suruOrtCR, suruStdCR, hayvanlar);
        
        const overall = calculateOverallTDI(sutSkoru, buyumeSkoru, saglikSkoru, uremeSkoru, isletmeTipi);
        
        return { hayvan, overall, sutSkoru, buyumeSkoru, saglikSkoru, uremeSkoru };
      });

    return list.sort((a, b) => b.overall - a.overall);
  }, [hayvanlar, sutKayitlari, agirlikKayitlari, saglikOlaylari, uremeKayitlari, isletmeTipi, filterTur]);

  if (hayvanlar.length === 0) {
    return <div className="text-center p-8 text-earth-500">Hayvan bulunamadı.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-nature-50 dark:bg-nature-900/30 p-4 rounded-xl border border-nature-200 dark:border-nature-800">
        <p className="text-sm text-nature-800 dark:text-nature-200">
          <strong>Sürü İçi Sıralama:</strong> İşletme tipinize ({isletmeTipi}) göre ağırlıklandırılmış Genel TDİ skoruna göre sürünüzdeki en değerli damızlıklar.
        </p>
        <select 
          value={filterTur}
          onChange={(e) => setFilterTur(e.target.value as any)}
          className="ml-4 p-2 border border-nature-300 dark:border-nature-700 rounded-lg focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-700 text-sm font-bold"
        >
          <option value="Tümü">Tüm Damızlıklar</option>
          <option value="İnek">Damızlık İnekler</option>
          <option value="Boğa">Damızlık Boğalar</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-700 rounded-xl border border-earth-200 dark:border-gray-600 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-earth-200 dark:divide-gray-600 text-sm">
          <thead className="bg-earth-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-earth-700 dark:text-gray-300">Sıra</th>
              <th className="px-4 py-3 text-left font-bold text-earth-700 dark:text-gray-300">Küpe No</th>
              <th className="px-4 py-3 text-left font-bold text-earth-700 dark:text-gray-300">Irk/Tip</th>
              <th className="px-4 py-3 text-right font-black text-nature-700 dark:text-nature-400">Genel TDİ</th>
              <th className="px-4 py-3 text-right font-bold text-earth-700 dark:text-gray-300">Süt</th>
              <th className="px-4 py-3 text-right font-bold text-earth-700 dark:text-gray-300">Büyüme</th>
              <th className="px-4 py-3 text-right font-bold text-earth-700 dark:text-gray-300">Sağlık</th>
              <th className="px-4 py-3 text-right font-bold text-earth-700 dark:text-gray-300">Üreme</th>
              <th className="px-4 py-3 text-center font-bold text-earth-700 dark:text-gray-300">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 dark:divide-gray-700">
            {ranking.map((row, index) => {
              const top10Percent = index < ranking.length * 0.1;
              const bottom20Percent = index > ranking.length * 0.8;
              
              return (
                <tr key={row.hayvan.id} className="hover:bg-earth-50/50 dark:hover:bg-gray-600/50 transition">
                  <td className="px-4 py-3 font-black text-earth-900 dark:text-white flex items-center">
                    {index + 1}
                    {top10Percent && <Trophy className="w-4 h-4 ml-2 text-yellow-500" />}
                  </td>
                  <td className="px-4 py-3 font-bold text-earth-900 dark:text-white">{row.hayvan.kupeNo}</td>
                  <td className="px-4 py-3 text-earth-600 dark:text-gray-300">{row.hayvan.irk} - {row.hayvan.tur}</td>
                  <td className="px-4 py-3 text-right font-black text-nature-600 dark:text-nature-400">{row.overall.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-earth-600 dark:text-gray-300">{row.sutSkoru.normalizedSkor.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-earth-600 dark:text-gray-300">{row.buyumeSkoru.normalizedSkor.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-earth-600 dark:text-gray-300">{row.saglikSkoru.normalizedSkor.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-earth-600 dark:text-gray-300">{row.uremeSkoru.normalizedSkor.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    {top10Percent ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-bold">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Elit Damızlık</span>
                      </span>
                    ) : bottom20Percent ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-red-100 text-red-800 text-xs font-bold">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>Reforma Alınabilir</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-bold">
                        <Minus className="w-3 h-3" />
                        <span>Standart</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default HerdRanking;
