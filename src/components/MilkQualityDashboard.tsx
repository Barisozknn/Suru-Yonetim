import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, CheckCircle, ShieldAlert, Droplet, Activity } from 'lucide-react';
import type { Hayvan, SutKaydi, Grup } from '../types';

interface Props {
  hayvanlar: Hayvan[];
  sutKayitlari: SutKaydi[];
  gruplar: Grup[];
}

const MilkQualityDashboard: React.FC<Props> = ({ hayvanlar, sutKayitlari, gruplar }) => {
  const [timeFilter, setTimeFilter] = useState<'7' | '30' | '365' | 'all'>('30');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const stats = useMemo(() => {
    // Sürü Filtresi
    const targetHayvanIds = new Set(
      groupFilter === 'all' 
        ? hayvanlar.map(h => h.id) 
        : hayvanlar.filter(h => h.grupId === groupFilter).map(h => h.id)
    );

    const filteredRecords = sutKayitlari.filter(k => targetHayvanIds.has(k.hayvanId));

    // Zaman Filtresi
    const now = new Date();
    let targetDate: Date | null = null;
    if (timeFilter !== 'all') {
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - parseInt(timeFilter));
      targetDate.setHours(0, 0, 0, 0);
    }
    const filteredByTimeAndGroup = filteredRecords.filter(k => !targetDate || new Date(k.tarih) >= targetDate);

    // 1. SCC Dağılımı (Filtrelenmiş verilere göre)
    const sccRecords = filteredByTimeAndGroup.filter(k => k.somatikHucre && k.somatikHucre > 0);
    let sccLow = 0;
    let sccMed = 0;
    let sccHigh = 0;

    // Hayvan bazlı ortalama SCC bul
    const hayvanSccMap = new Map<string, { total: number; count: number }>();
    sccRecords.forEach(k => {
      const mevcut = hayvanSccMap.get(k.hayvanId) || { total: 0, count: 0 };
      hayvanSccMap.set(k.hayvanId, { total: mevcut.total + k.somatikHucre!, count: mevcut.count + 1 });
    });

    const hayvanSccAverages: { hayvanId: string; avgSCC: number }[] = [];
    hayvanSccMap.forEach((val, key) => {
      const avg = val.total / val.count;
      hayvanSccAverages.push({ hayvanId: key, avgSCC: avg });
      if (avg < 200000) sccLow++;
      else if (avg <= 400000) sccMed++;
      else sccHigh++;
    });

    // En Yüksek SCC'li 5 Hayvan
    const topSccAnimals = hayvanSccAverages
      .sort((a, b) => b.avgSCC - a.avgSCC)
      .slice(0, 5)
      .map(item => {
        const h = hayvanlar.find(x => x.id === item.hayvanId);
        return {
          hayvanId: item.hayvanId,
          kupeNo: h?.kupeNo || 'Bilinmiyor',
          avgSCC: item.avgSCC,
          mastitisRisk: item.avgSCC > 400000 ? 'Yüksek' : (item.avgSCC > 200000 ? 'Orta' : 'Düşük')
        };
      });

    // 2. Sürü Geneli Ortalama Değerler
    let yagTotal = 0, yagCount = 0;
    let proTotal = 0, proCount = 0;
    let lakTotal = 0, lakCount = 0;

    filteredByTimeAndGroup.forEach(k => {
      if (k.yagYuzde) { yagTotal += k.yagYuzde; yagCount++; }
      if (k.proteinYuzde) { proTotal += k.proteinYuzde; proCount++; }
      if (k.laktozYuzde) { lakTotal += k.laktozYuzde; lakCount++; }
    });

    const yagOrt = yagCount > 0 ? yagTotal / yagCount : 0;
    const proOrt = proCount > 0 ? proTotal / proCount : 0;
    const lakOrt = lakCount > 0 ? lakTotal / lakCount : 0;

    // 3. Aylık SCC Trendi (Son 6 ay - tüm kayıtlardan değil seçili gruptan alalım)
    const aylikSccMap = new Map<string, { total: number; count: number }>();
    filteredRecords.forEach(k => {
      if (k.somatikHucre && k.somatikHucre > 0) {
        const ay = k.tarih.slice(0, 7); // YYYY-MM
        const mevcut = aylikSccMap.get(ay) || { total: 0, count: 0 };
        aylikSccMap.set(ay, { total: mevcut.total + k.somatikHucre, count: mevcut.count + 1 });
      }
    });

    const trendData = Array.from(aylikSccMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([ay, val]) => ({
        ay: new Date(ay + '-01').toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        'Ort. SCC': Math.round(val.total / val.count)
      }));

    return {
      sccLow, sccMed, sccHigh,
      topSccAnimals,
      yagOrt, proOrt, lakOrt,
      trendData
    };
  }, [hayvanlar, sutKayitlari, groupFilter, timeFilter]);

  return (
    <div className="space-y-6">
      
      {/* Filtreleme Paneli */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-earth-500 dark:text-gray-400 mb-1 uppercase">Sürü Grubu</label>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full p-3 bg-earth-50 dark:bg-gray-900 border border-earth-200 dark:border-gray-700 rounded-xl font-bold text-earth-900 dark:text-gray-100 focus:ring-2 focus:ring-nature-500"
          >
            <option value="all">Tüm Sürü</option>
            {gruplar.filter(g => g.tur === 'İnek' || g.tur === 'Karma').map(g => (
              <option key={g.id} value={g.id}>{g.ad}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-earth-500 dark:text-gray-400 mb-1 uppercase">Zaman Aralığı</label>
          <select
            value={timeFilter}
            onChange={(e: any) => setTimeFilter(e.target.value)}
            className="w-full p-3 bg-earth-50 dark:bg-gray-900 border border-earth-200 dark:border-gray-700 rounded-xl font-bold text-earth-900 dark:text-gray-100 focus:ring-2 focus:ring-nature-500"
          >
            <option value="7">Son 7 Gün</option>
            <option value="30">Son 30 Gün (Aylık)</option>
            <option value="365">Son 1 Yıl (Yıllık)</option>
            <option value="all">Tüm Zamanlar</option>
          </select>
        </div>
      </div>

      {/* Süt İçeriği Ortalama Değerleri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 rounded-lg">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400">Sürü Ort. Yağ</p>
            <p className="text-2xl font-black text-earth-900 dark:text-gray-100">
              %{stats.yagOrt > 0 ? stats.yagOrt.toFixed(2) : '-'}
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400">Sürü Ort. Protein</p>
            <p className="text-2xl font-black text-earth-900 dark:text-gray-100">
              %{stats.proOrt > 0 ? stats.proOrt.toFixed(2) : '-'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
            <Droplet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400">Sürü Ort. Laktoz</p>
            <p className="text-2xl font-black text-earth-900 dark:text-gray-100">
              %{stats.lakOrt > 0 ? stats.lakOrt.toFixed(2) : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* SCC Risk Dağılımı */}
      <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mt-6">
        SCC Dağılımı (Hayvan Sayısı) {timeFilter !== 'all' && `- Son ${timeFilter} Gün`}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-400 mb-1">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">Sağlıklı (&lt;200k)</span>
            </div>
            <p className="text-2xl font-black text-green-800 dark:text-green-300">{stats.sccLow}</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-yellow-700 dark:text-yellow-400 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">Uyarı (200k-400k)</span>
            </div>
            <p className="text-2xl font-black text-yellow-800 dark:text-yellow-300">{stats.sccMed}</p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-400 mb-1">
              <ShieldAlert className="w-5 h-5" />
              <span className="font-bold">Mastitis Riski (&gt;400k)</span>
            </div>
            <p className="text-2xl font-black text-red-800 dark:text-red-300">{stats.sccHigh}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* SCC Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-earth-500" />
             Aylık Ortalama SCC Trendi
          </h3>
          <div className="h-64 w-full">
            {stats.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="ay" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} tickFormatter={val => `${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => `${Math.round(value).toLocaleString('tr-TR')} hücre/ml`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="Ort. SCC" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-earth-500 text-sm">Yeterli SCC kaydı yok</div>
            )}
          </div>
        </div>

        {/* En Yüksek SCC'li 5 Hayvan */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-6 flex items-center">
          <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
          En Yüksek SCC'li 5 Hayvan {timeFilter !== 'all' && `(Son ${timeFilter} Gün)`}
        </h3>
          
          {stats.topSccAnimals.length > 0 ? (
            <div className="space-y-3">
              {stats.topSccAnimals.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-earth-50 dark:bg-gray-900 border border-earth-100 dark:border-gray-700">
                   <div className="font-bold text-earth-900 dark:text-gray-100">{item.kupeNo}</div>
                   <div className="text-right">
                     <div className="font-black text-earth-900 dark:text-gray-100">{Math.round(item.avgSCC).toLocaleString('tr-TR')}</div>
                     <div className={`text-xs font-bold ${
                       item.mastitisRisk === 'Yüksek' ? 'text-red-500' : (item.mastitisRisk === 'Orta' ? 'text-yellow-500' : 'text-green-500')
                     }`}>
                       Risk: {item.mastitisRisk}
                     </div>
                   </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="h-full flex items-center justify-center text-earth-500 text-sm pb-10">Son 30 güne ait SCC kaydı bulunamadı</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilkQualityDashboard;
