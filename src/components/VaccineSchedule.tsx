import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { PlanlananAsi } from '../types';
import { X, CheckCircle2, Clock, AlertTriangle, Syringe, Filter } from 'lucide-react';

type Filtre = 'Tümü' | 'Gecikmiş' | 'Bu Hafta' | 'Planlanan' | 'Yapılmış';

const today = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const nextWeek = () => { const d = today(); d.setDate(d.getDate() + 7); return d; };

const getStatus = (asi: PlanlananAsi): 'yapilmis' | 'gecikmis' | 'bu_hafta' | 'planlanan' => {
  if (asi.yapildiMi) return 'yapilmis';
  const tarih = new Date(asi.planlanaTarih); tarih.setHours(0,0,0,0);
  const now = today();
  if (tarih < now) return 'gecikmis';
  if (tarih <= nextWeek()) return 'bu_hafta';
  return 'planlanan';
};

const STATUS_CONFIG = {
  yapilmis: { label: 'Yapıldı', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-nature-600', bg: 'bg-nature-50 border-nature-200', badge: 'bg-nature-100 text-nature-700' },
  gecikmis: { label: 'Gecikmiş', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' },
  bu_hafta: { label: 'Bu Hafta', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  planlanan: { label: 'Planlanan', icon: <Syringe className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
};

const VaccineSchedule: React.FC = () => {
  const asilar = useLiveFarmQuery(() => db.planlananAsilar.orderBy('planlanaTarih').toArray()) || [];
  const [filtre, setFiltre] = useState<Filtre>('Tümü');

  const filtrelenmis = asilar.filter(a => {
    const s = getStatus(a);
    if (filtre === 'Tümü') return true;
    if (filtre === 'Gecikmiş') return s === 'gecikmis';
    if (filtre === 'Bu Hafta') return s === 'bu_hafta';
    if (filtre === 'Planlanan') return s === 'planlanan';
    if (filtre === 'Yapılmış') return s === 'yapilmis';
    return true;
  });

  const handleToggleYapildi = async (asi: PlanlananAsi) => {
    const updated = { ...asi, yapildiMi: !asi.yapildiMi, yapilmaTarihi: !asi.yapildiMi ? new Date().toISOString().split('T')[0] : undefined };
    await db.planlananAsilar.put(updated);
  };

  const handleSil = async (id: string) => {
    if (!confirm('Bu aşı planını silmek istediğinizden emin misiniz?')) return;
    await db.planlananAsilar.delete(id);
  };

  const ozet = {
    gecikmis: asilar.filter(a => getStatus(a) === 'gecikmis').length,
    bu_hafta: asilar.filter(a => getStatus(a) === 'bu_hafta').length,
    planlanan: asilar.filter(a => getStatus(a) === 'planlanan').length,
    yapilmis: asilar.filter(a => getStatus(a) === 'yapilmis').length,
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-earth-200 flex flex-col h-full">
        <div className="p-4 border-b border-earth-200 flex justify-between items-center bg-purple-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Syringe className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-black text-earth-900">Aşı Takvimi</h2>
              <p className="text-xs text-earth-500">Planlanan ve gerçekleşen aşıların özeti</p>
            </div>
          </div>
        </div>

        {/* Özet Kartları */}
        <div className="grid grid-cols-4 gap-3 p-4 border-b border-earth-100">
          {[
            { key: 'gecikmis', label: 'Gecikmiş', value: ozet.gecikmis, color: 'bg-red-50 text-red-700 border-red-200' },
            { key: 'bu_hafta', label: 'Bu Hafta', value: ozet.bu_hafta, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
            { key: 'planlanan', label: 'Planlanan', value: ozet.planlanan, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { key: 'yapilmis', label: 'Yapılmış', value: ozet.yapilmis, color: 'bg-nature-50 text-nature-700 border-nature-200' },
          ].map(item => (
            <div key={item.key} className={`text-center p-2 rounded-xl border ${item.color}`}>
              <div className="text-2xl font-black">{item.value}</div>
              <div className="text-xs font-semibold">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Filtreler */}
        <div className="flex items-center space-x-2 p-4 border-b border-earth-100 overflow-x-auto">
          <Filter className="w-4 h-4 text-earth-400 flex-shrink-0" />
          {(['Tümü', 'Gecikmiş', 'Bu Hafta', 'Planlanan', 'Yapılmış'] as Filtre[]).map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg whitespace-nowrap transition ${filtre === f ? 'bg-earth-800 text-white' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtrelenmis.length === 0 && (
            <div className="text-center py-12 text-earth-400">
              <Syringe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Bu kategoride aşı bulunamadı.</p>
            </div>
          )}

          {filtrelenmis.map(asi => {
            const status = getStatus(asi);
            const config = STATUS_CONFIG[status];
            return (
              <div key={asi.id} className={`flex items-center space-x-3 p-3 rounded-xl border ${config.bg} group`}>
                <div className={`flex-shrink-0 ${config.color}`}>{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="font-bold text-earth-900 text-sm">{asi.asiAd}</span>
                    <span className="text-xs text-earth-500 font-mono bg-white/70 px-2 py-0.5 rounded border border-earth-200">{asi.hayvanKupeNo}</span>
                    <span className="text-xs text-earth-400">{asi.protokolAd}</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-0.5">
                    <span className="text-xs text-earth-500">{new Date(asi.planlanaTarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
                    {asi.yapilmaTarihi && (
                      <span className="text-xs text-earth-400">Yapıldı: {new Date(asi.yapilmaTarihi).toLocaleDateString('tr-TR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition items-center">
                  <button onClick={() => handleToggleYapildi(asi)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition ${asi.yapildiMi ? 'bg-earth-100 text-earth-600 hover:bg-earth-200' : 'bg-nature-600 text-white hover:bg-nature-700'}`}>
                    {asi.yapildiMi ? 'Geri Al' : '✓ Yapıldı'}
                  </button>
                  <button onClick={() => handleSil(asi.id)} className="p-1.5 text-earth-400 hover:text-red-500 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VaccineSchedule;
