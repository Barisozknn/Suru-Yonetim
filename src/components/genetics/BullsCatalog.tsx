import React, { useMemo } from 'react';
import { useLiveFarmQuery } from '../../hooks/useLiveFarmQuery';
import { db } from '../../lib/db';
import { generateBullsCatalog } from '../../utils/progenyTesting';
import { calcHerdMilkAvg, calcHerdADGAvg } from '../../utils/geneticScoring';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const BullsCatalog: React.FC = () => {
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray()) || [];

  const catalog = useMemo(() => {
    if (hayvanlar.length === 0) return [];
    
    const sutS = calcHerdMilkAvg(sutKayitlari);
    const agS = calcHerdADGAvg(agirlikKayitlari, hayvanlar);
    return generateBullsCatalog(hayvanlar, uremeKayitlari, sutKayitlari, agirlikKayitlari, sutS, agS);
  }, [hayvanlar, uremeKayitlari, sutKayitlari, agirlikKayitlari]);

  if (catalog.length === 0) {
    return <div className="text-center p-8 text-earth-500">Katalog oluşturmak için yeterli boğa ve yavru verisi bulunamadı.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-nature-50 dark:bg-nature-900/30 p-4 rounded-xl border border-nature-200 dark:border-nature-800 text-sm text-nature-800 dark:text-nature-200">
        <strong>Yavru Testi (Progeny Testing):</strong> Bu liste, boğaları (hem sürüdeki hem de dışarıdan alınan spermaları) kendi yavrularının işletmenizdeki performanslarına göre sıralar.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalog.map((boga) => (
          <div key={boga.bogaId} className="bg-white dark:bg-gray-700 border border-earth-200 dark:border-gray-600 rounded-xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-black text-lg text-earth-900 dark:text-gray-100 flex items-center">
                  {boga.bogaAdi}
                  {boga.isVirtualSperm && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Sperma</span>}
                </h3>
                <p className="text-sm text-earth-500 dark:text-gray-400">{boga.irk}</p>
              </div>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold ${boga.guvenilirlik >= 70 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {boga.guvenilirlik >= 70 ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>%{boga.guvenilirlik} Güven</span>
              </div>
            </div>

            <div className="text-xs text-earth-500 mb-4 pb-4 border-b border-earth-100 dark:border-gray-600">
              Toplam {boga.yavruSayisi} yavru kaydı bulundu.
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-bold text-earth-700 dark:text-gray-300">Yavru Süt Ortalaması</span>
                <span className={`font-bold ${boga.yavruOrtalamaSutSapma && boga.yavruOrtalamaSutSapma > 0 ? 'text-green-600' : 'text-earth-900 dark:text-white'}`}>
                  {boga.yavruOrtalamaSut ? `${boga.yavruOrtalamaSut.toFixed(1)} L` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-bold text-earth-700 dark:text-gray-300">Yavru Büyüme (Canlı Ağırlık)</span>
                <span className={`font-bold ${boga.yavruOrtalamaCanliAgirlikSapma && boga.yavruOrtalamaCanliAgirlikSapma > 0 ? 'text-green-600' : 'text-earth-900 dark:text-white'}`}>
                  {boga.yavruOrtalamaCanliAgirlik ? `${boga.yavruOrtalamaCanliAgirlik.toFixed(1)} Kg` : '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BullsCatalog;
