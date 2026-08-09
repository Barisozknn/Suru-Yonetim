import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertCircle, Activity, Banknote, ShieldAlert, Skull } from 'lucide-react';
import type { SaglikOlayi, Hayvan } from '../types';

interface Props {
  saglikOlaylari: SaglikOlayi[];
  hayvanlar: Hayvan[];
}

const HealthStats: React.FC<Props> = ({ saglikOlaylari, hayvanlar }) => {
  const [timeFilter, setTimeFilter] = useState<'all' | '12' | '6' | '1'>('all');

  // KPI Calculations
  const stats = useMemo(() => {
    let toplamGider = 0;
    const hastalikSayilari: Record<string, number> = {};
    const aylikGiderler: Record<string, number> = {};
    const arinmadaOlanlar: { olay: SaglikOlayi; hayvan: Hayvan; bitis: Date }[] = [];

    const now = new Date();

    let filteredEvents = saglikOlaylari;
    if (timeFilter !== 'all') {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - parseInt(timeFilter));
      filteredEvents = saglikOlaylari.filter(o => new Date(o.tarih) >= targetDate);
    }

    filteredEvents.forEach(olay => {
      // Toplam Gider
      toplamGider += olay.maliyet || 0;

      // Hastalık Dağılımı (Sadece Hastalık ve Yaralanma gibi olaylar)
      if (olay.tur === 'Muayene') {
        const hAd = olay.hastalikAdi || 'Bilinmeyen Hastalık / Genel Muayene';
        hastalikSayilari[hAd] = (hastalikSayilari[hAd] || 0) + 1;
      }

      // Aylık Trend
      if (olay.tarih) {
        const ay = olay.tarih.slice(0, 7); // YYYY-MM
        aylikGiderler[ay] = (aylikGiderler[ay] || 0) + (olay.maliyet || 0);
      }

      // Arınma Kontrolü
      if (olay.arinmaSuresiGun && olay.arinmaSuresiGun > 0) {
        const olayDate = new Date(olay.tarih);
        const bitisDate = new Date(olayDate.getTime() + olay.arinmaSuresiGun * 24 * 60 * 60 * 1000);
        if (bitisDate > now) {
          const hayvan = hayvanlar.find(h => h.id === olay.hayvanId);
          if (hayvan) {
            arinmadaOlanlar.push({ olay, hayvan, bitis: bitisDate });
          }
        }
      }
    });

    // Format Aylik Veri
    const aylikData = Object.entries(aylikGiderler)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Son 6 ay
      .map(([ay, gider]) => ({
        ay: new Date(ay + '-01').toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        Gider: gider
      }));

    // Format Hastalik Veri
    const hastalikData = Object.entries(hastalikSayilari)
      .sort((a, b) => b[1] - a[1]) // Çoktan aza
      .slice(0, 5) // Top 5
      .map(([tur, sayi]) => ({ tur, 'Vaka Sayısı': sayi }));

    // Ölüm Nedenleri Hesaplaması
    let filteredOluHayvanlar = hayvanlar.filter(h => h.durum === 'Öldü' && h.olumTarihi);
    if (timeFilter !== 'all') {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - parseInt(timeFilter));
      filteredOluHayvanlar = filteredOluHayvanlar.filter(h => new Date(h.olumTarihi!) >= targetDate);
    }

    const olumHastaliklari: Record<string, number> = {};
    let toplamOlenHastaliktan = 0;
    let toplamOlenDiger = 0;

    filteredOluHayvanlar.forEach(h => {
      if (h.olumNedeniTipi === 'Hastalık') {
        toplamOlenHastaliktan++;
        const hAd = h.olumNedeniDetay || 'Bilinmeyen Hastalık';
        olumHastaliklari[hAd] = (olumHastaliklari[hAd] || 0) + 1;
      } else {
        toplamOlenDiger++;
      }
    });

    const olumHastalikData = Object.entries(olumHastaliklari)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tur, sayi]) => ({ tur, 'Ölüm Sayısı': sayi }));

    const olumNedenData = [
      { name: 'Hastalık', value: toplamOlenHastaliktan },
      { name: 'Diğer', value: toplamOlenDiger }
    ].filter(d => d.value > 0);

    const aktifHayvanSayisi = hayvanlar.filter(h => h.durum === 'Aktif').length;
    const ortalamaGider = aktifHayvanSayisi > 0 ? (toplamGider / aktifHayvanSayisi) : 0;

    return {
      toplamGider,
      ortalamaGider,
      aylikData,
      hastalikData,
      olumHastalikData,
      olumNedenData,
      arinmadaOlanlar: arinmadaOlanlar.sort((a, b) => a.bitis.getTime() - b.bitis.getTime())
    };
  }, [saglikOlaylari, hayvanlar, timeFilter]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
  };

  const COLORS = ['#ef4444', '#64748b']; // Red for Hastalık, Gray for Diğer

  return (
    <div className="space-y-6">
      
      {/* Filtre */}
      <div className="flex justify-end">
        <select 
          value={timeFilter} 
          onChange={e => setTimeFilter(e.target.value as any)}
          className="p-2 border border-earth-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-nature-500 outline-none text-earth-700 dark:text-gray-200"
        >
          <option value="all">Tüm Zamanlar</option>
          <option value="12">Son 12 Ay</option>
          <option value="6">Son 6 Ay</option>
          <option value="1">Son 1 Ay</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400">Toplam Sağlık Gideri</p>
            <p className="text-2xl font-black text-earth-900 dark:text-gray-100">{formatMoney(stats.toplamGider)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-earth-500 dark:text-gray-400">Aktif Hayvan Başı Ort. Maliyet</p>
            <p className="text-2xl font-black text-earth-900 dark:text-gray-100">{formatMoney(stats.ortalamaGider)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aylık Trend */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center">
             <Activity className="w-5 h-5 mr-2 text-earth-500" />
             Aylık Sağlık Gideri Trendi (Son 6 Ay)
          </h3>
          <div className="h-64 w-full">
            {stats.aylikData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.aylikData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="ay" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} tickFormatter={val => `₺${val/1000}k`} />
                  <Tooltip 
                    formatter={(value: any) => formatMoney(Number(value))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="Gider" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-earth-500 text-sm">Yeterli veri yok</div>
            )}
          </div>
        </div>

        {/* Hastalık Dağılımı */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center">
             <AlertCircle className="w-5 h-5 mr-2 text-earth-500" />
             Sürü Geneli En Çok Görülen Hastalıklar
          </h3>
          <div className="h-64 w-full">
            {stats.hastalikData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hastalikData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                  <XAxis type="number" stroke="#888" fontSize={12} />
                  <YAxis dataKey="tur" type="category" stroke="#888" fontSize={12} width={100} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Vaka Sayısı" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-earth-500 text-sm">Yeterli veri yok</div>
            )}
          </div>
        </div>
        {/* Ölüm Nedenleri İstatistikleri */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center">
             <Skull className="w-5 h-5 mr-2 text-earth-500" />
             En Çok Ölüme Neden Olan Hastalıklar
          </h3>
          <div className="h-64 w-full">
            {stats.olumHastalikData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.olumHastalikData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                  <XAxis type="number" stroke="#888" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="tur" type="category" stroke="#888" fontSize={12} width={100} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Ölüm Sayısı" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-earth-500 text-sm">Yeterli veri yok</div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 mb-4 flex items-center">
             <Skull className="w-5 h-5 mr-2 text-earth-500" />
             Ölüm Nedeni Dağılımı
          </h3>
          <div className="h-64 w-full">
            {stats.olumNedenData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.olumNedenData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.olumNedenData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-earth-500 text-sm">Yeterli veri yok</div>
            )}
          </div>
        </div>
      </div>

      {/* Arınma Süresi Uyarısı */}
      {stats.arinmadaOlanlar.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-orange-100/50 dark:bg-orange-900/40 border-b border-orange-200 dark:border-orange-800/50 flex items-center text-orange-800 dark:text-orange-300">
            <ShieldAlert className="w-5 h-5 mr-2" />
            <h3 className="font-bold">Arınma Süresi Devam Eden Hayvanlar ({stats.arinmadaOlanlar.length})</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-orange-50/50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 font-bold">Küpe No</th>
                  <th className="px-4 py-3 font-bold">Uygulanan Tedavi/İlaç</th>
                  <th className="px-4 py-3 font-bold">Uygulama Tarihi</th>
                  <th className="px-4 py-3 font-bold text-right">Arınma Bitiş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-100 dark:divide-orange-800/30">
                {stats.arinmadaOlanlar.map((item, i) => (
                  <tr key={i} className="hover:bg-orange-50 dark:hover:bg-orange-900/10 transition">
                    <td className="px-4 py-3 font-bold text-earth-900 dark:text-gray-200">{item.hayvan.kupeNo}</td>
                    <td className="px-4 py-3 text-earth-700 dark:text-gray-300">{item.olay.tur} {item.olay.aciklama ? `(${item.olay.aciklama})` : ''}</td>
                    <td className="px-4 py-3 text-earth-500 dark:text-gray-400">{new Date(item.olay.tarih).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-3 text-right font-bold text-orange-600 dark:text-orange-400">
                      {item.bitis.toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthStats;
