import React, { useMemo } from 'react';
import { PiCow } from 'react-icons/pi';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';

const HerdBirthAnalysis: React.FC = () => {
  const allUremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];

  const dogumSekliDagilimi = useMemo(() => {
    const dagilim = { 'Sağlıklı': 0, 'Güç Doğum': 0, 'Ölü Doğum': 0, 'Düşük': 0 };
    let total = 0;
    
    const dogumlar = allUremeKayitlari.filter(u => u.tur === 'Doğum');
    dogumlar.forEach(d => {
      const degerlendirme = d.detaylar?.dogumDegerlendirmesi;
      if (degerlendirme && dagilim[degerlendirme as keyof typeof dagilim] !== undefined) {
        dagilim[degerlendirme as keyof typeof dagilim]++;
        total++;
      }
    });

    return { dagilim, total };
  }, [allUremeKayitlari]);

  if (dogumSekliDagilimi.total === 0) {
    return null; // Eğer hiç doğum verisi yoksa kartı gizle
  }

  return (
    <div className="bg-pink-50 dark:bg-pink-900/20 p-5 rounded-2xl border border-pink-200 dark:border-pink-800/50 flex-shrink-0">
      <div className="flex items-center space-x-2 text-pink-800 mb-4">
        <PiCow className="w-6 h-6" />
        <h3 className="text-lg font-black">Sürü Geneli Doğum Şekli Analizi</h3>
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 w-full flex bg-gray-200 dark:bg-gray-700 h-8 rounded-full overflow-hidden shadow-inner">
          {dogumSekliDagilimi.dagilim['Sağlıklı'] > 0 && (
            <div 
              style={{ width: `${(dogumSekliDagilimi.dagilim['Sağlıklı'] / dogumSekliDagilimi.total) * 100}%` }} 
              className="bg-emerald-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
              title={`Sağlıklı: ${dogumSekliDagilimi.dagilim['Sağlıklı']}`}
            >
              {Math.round((dogumSekliDagilimi.dagilim['Sağlıklı'] / dogumSekliDagilimi.total) * 100)}%
            </div>
          )}
          {dogumSekliDagilimi.dagilim['Güç Doğum'] > 0 && (
            <div 
              style={{ width: `${(dogumSekliDagilimi.dagilim['Güç Doğum'] / dogumSekliDagilimi.total) * 100}%` }} 
              className="bg-orange-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
              title={`Güç Doğum: ${dogumSekliDagilimi.dagilim['Güç Doğum']}`}
            >
              {Math.round((dogumSekliDagilimi.dagilim['Güç Doğum'] / dogumSekliDagilimi.total) * 100)}%
            </div>
          )}
          {dogumSekliDagilimi.dagilim['Ölü Doğum'] > 0 && (
            <div 
              style={{ width: `${(dogumSekliDagilimi.dagilim['Ölü Doğum'] / dogumSekliDagilimi.total) * 100}%` }} 
              className="bg-red-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
              title={`Ölü Doğum: ${dogumSekliDagilimi.dagilim['Ölü Doğum']}`}
            >
              {Math.round((dogumSekliDagilimi.dagilim['Ölü Doğum'] / dogumSekliDagilimi.total) * 100)}%
            </div>
          )}
          {dogumSekliDagilimi.dagilim['Düşük'] > 0 && (
            <div 
              style={{ width: `${(dogumSekliDagilimi.dagilim['Düşük'] / dogumSekliDagilimi.total) * 100}%` }} 
              className="bg-purple-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
              title={`Düşük: ${dogumSekliDagilimi.dagilim['Düşük']}`}
            >
              {Math.round((dogumSekliDagilimi.dagilim['Düşük'] / dogumSekliDagilimi.total) * 100)}%
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center text-sm font-bold bg-white dark:bg-gray-800 p-4 rounded-xl border border-pink-100 dark:border-pink-900/50 shadow-sm min-w-[300px]">
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span>Sağlıklı ({dogumSekliDagilimi.dagilim['Sağlıklı']})</span>
          </div>
          <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Güç Doğum ({dogumSekliDagilimi.dagilim['Güç Doğum']})</span>
          </div>
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Ölü Doğum ({dogumSekliDagilimi.dagilim['Ölü Doğum']})</span>
          </div>
          <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Düşük ({dogumSekliDagilimi.dagilim['Düşük']})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HerdBirthAnalysis;
