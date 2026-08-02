import React from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { calculateAnimalProfitability } from '../utils/profitability';
import { Trophy, TrendingUp, AlertCircle, Banknote, HeartPulse, Droplets, Sprout, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Hayvan } from '../types';

interface Props {
  hayvan: Hayvan;
}

const AnimalProfitability: React.FC<Props> = ({ hayvan }) => {
  const { sutLitreFiyati, buzagiFiyati } = useStore();
  
  const sutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.where('hayvanId').equals(hayvan.id).toArray(), [hayvan.id]) || [];
  const saglikOlaylari = useLiveFarmQuery(() => db.saglikOlaylari.where('hayvanId').equals(hayvan.id).toArray(), [hayvan.id]) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.where('hayvanId').equals(hayvan.id).toArray(), [hayvan.id]) || [];
  const yemler = useLiveFarmQuery(() => db.yemler.toArray()) || [];
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];

  // Sürü ortalaması için tüm veriler
  const tumHayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const tumSutKayitlari = useLiveFarmQuery(() => db.sutKayitlari.toArray()) || [];
  const tumSaglikOlaylari = useLiveFarmQuery(() => db.saglikOlaylari.toArray()) || [];
  const tumUremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];

  const profitData = calculateAnimalProfitability(
    hayvan,
    sutKayitlari,
    saglikOlaylari,
    uremeKayitlari,
    yemler,
    gruplar,
    sutLitreFiyati,
    buzagiFiyati
  );

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const isProfitable = profitData.netProfit > 0;

  // Sürü Ortalaması Hesaplama
  let herdAvgRevenue = 0;
  let herdAvgCost = 0;
  let herdAvgProfit = 0;

  const activeInekler = tumHayvanlar.filter(h => h.tur === 'İnek' && h.durum === 'Aktif');
  if (activeInekler.length > 0 && tumSutKayitlari.length > 0) { // Sadece veri varsa hesapla
    let totalRev = 0;
    let totalCost = 0;
    let totalProfit = 0;

    activeInekler.forEach(inek => {
      const p = calculateAnimalProfitability(
        inek,
        tumSutKayitlari.filter(s => s.hayvanId === inek.id),
        tumSaglikOlaylari.filter(s => s.hayvanId === inek.id),
        tumUremeKayitlari.filter(u => u.hayvanId === inek.id),
        yemler,
        gruplar,
        sutLitreFiyati,
        buzagiFiyati
      );
      totalRev += p.totalRevenue;
      totalCost += p.totalCost;
      totalProfit += p.netProfit;
    });

    herdAvgRevenue = totalRev / activeInekler.length;
    herdAvgCost = totalCost / activeInekler.length;
    herdAvgProfit = totalProfit / activeInekler.length;
  }

  // Grafik Verisi
  const chartData = [
    {
      name: 'Gelir',
      'Bu Hayvan': profitData.totalRevenue,
      'Sürü Ortalaması': herdAvgRevenue,
    },
    {
      name: 'Gider',
      'Bu Hayvan': profitData.totalCost,
      'Sürü Ortalaması': herdAvgCost,
    },
    {
      name: 'Net Kâr',
      'Bu Hayvan': profitData.netProfit,
      'Sürü Ortalaması': herdAvgProfit,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-emerald-800 dark:text-emerald-300 font-bold text-lg mb-1 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Son 12 Aylık Karlılık Analizi
            </h3>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm">
              Bu hayvanın işletmenize son 1 yıl içinde sağladığı tahmini net katkı.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Net Kar (12 Ay)</div>
            <div className={`text-3xl font-black ${isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
              {profitData.netProfit > 0 ? '+' : ''}{formatMoney(profitData.netProfit)}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
               <div className="text-xs font-bold text-gray-500 mb-1">ROI (Yatırım Getirisi)</div>
               <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                  % {profitData.roi.toFixed(1)}
               </div>
               <p className="text-xs text-gray-400 mt-1">Harcanan her 100₺'nin getirisi</p>
            </div>
            
            <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
               <div className="text-xs font-bold text-gray-500 mb-1">Toplam Gelir</div>
               <div className="text-xl font-bold text-blue-600">
                  {formatMoney(profitData.totalRevenue)}
               </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
               <div className="text-xs font-bold text-gray-500 mb-1">Toplam Gider</div>
               <div className="text-xl font-bold text-red-500">
                  {formatMoney(profitData.totalCost)}
               </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h4 className="font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center text-lg">
             <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
             Gelir Kalemleri
          </h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-center space-x-3">
                   <Droplets className="w-5 h-5 text-blue-500" />
                   <div>
                      <div className="font-bold text-earth-800 dark:text-gray-200">Süt Geliri</div>
                      <div className="text-xs text-earth-500 dark:text-gray-400">{profitData.details.totalMilkLt.toFixed(0)} Litre x {sutLitreFiyati}₺</div>
                   </div>
                </div>
                <div className="font-black text-blue-600">{formatMoney(profitData.details.milkRevenue)}</div>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="flex items-center space-x-3">
                   <Sprout className="w-5 h-5 text-purple-500" />
                   <div>
                      <div className="font-bold text-earth-800 dark:text-gray-200">Buzağı Geliri</div>
                      <div className="text-xs text-earth-500 dark:text-gray-400">Tahmini Değer</div>
                   </div>
                </div>
                <div className="font-black text-purple-600">{formatMoney(profitData.details.calfRevenue)}</div>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h4 className="font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center text-lg">
             <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
             Gider Kalemleri
          </h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="flex items-center space-x-3">
                   <Banknote className="w-5 h-5 text-orange-500" />
                   <div>
                      <div className="font-bold text-earth-800 dark:text-gray-200">Yem Maliyeti</div>
                      <div className="text-xs text-earth-500 dark:text-gray-400">Bulunduğu gruba göre tahmini</div>
                   </div>
                </div>
                <div className="font-black text-red-500">{formatMoney(profitData.details.feedCost)}</div>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="flex items-center space-x-3">
                   <HeartPulse className="w-5 h-5 text-red-500" />
                   <div>
                      <div className="font-bold text-earth-800 dark:text-gray-200">Sağlık & Tedavi</div>
                      <div className="text-xs text-earth-500 dark:text-gray-400">İlaç ve veteriner giderleri</div>
                   </div>
                </div>
                <div className="font-black text-red-500">{formatMoney(profitData.details.healthCost)}</div>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <div className="flex items-center space-x-3">
                   <Trophy className="w-5 h-5 text-pink-500" />
                   <div>
                      <div className="font-bold text-earth-800 dark:text-gray-200">Üreme Maliyeti</div>
                      <div className="text-xs text-earth-500 dark:text-gray-400">Tohumlama vb. işlemler</div>
                   </div>
                </div>
                <div className="font-black text-red-500">{formatMoney(profitData.details.reproCost)}</div>
             </div>
          </div>
        </div>
      </div>
      
      {!isProfitable && (
         <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
               <h4 className="font-bold text-orange-800 dark:text-orange-300">Bu Hayvan Zarar Ediyor</h4>
               <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                  Son 12 aylık verilere göre bu hayvanın giderleri, getirdiği gelirin üzerindedir. Sürüden çıkarma (culling) kararı almayı değerlendirebilirsiniz. Zooteknik nedenler ve yaş faktörünü de göz önünde bulundurmayı unutmayın.
               </p>
            </div>
         </div>
      )}

      {/* Sürü Ortalaması ile Karşılaştırma Grafiği */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-earth-200 dark:border-gray-700 shadow-sm mt-6">
        <h4 className="font-bold text-earth-800 dark:text-gray-200 mb-6 flex items-center text-lg">
           <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
           Sürü Ortalaması ile Karşılaştırma (Son 12 Ay)
        </h4>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" stroke="#888" fontSize={12} fontWeight="bold" />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `${value / 1000}k ₺`} />
              <Tooltip 
                formatter={(value: number) => formatMoney(value)}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="Bu Hayvan" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="Sürü Ortalaması" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnimalProfitability;
