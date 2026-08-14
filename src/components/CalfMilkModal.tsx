import React, { useState, useMemo } from 'react';
import { X, Save, Trash2, Droplet, TrendingUp, Calendar } from 'lucide-react';
import { db } from '../lib/db';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import type { BuzagiSutKaydi, Hayvan } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  hayvan: Hayvan;
  onClose: () => void;
}

const OGUNLER = ['Sabah', 'Öğle', 'Akşam', 'Gece'] as const;
const TIPLER = ['Tam Süt', 'Süt İkamesi', 'Karma'] as const;

const CalfMilkModal: React.FC<Props> = ({ hayvan, onClose }) => {
  const bugun = new Date().toISOString().split('T')[0];

  // Form state
  const [tarih, setTarih] = useState(bugun);
  const [miktarLt, setMiktarLt] = useState('');
  const [ogun, setOgun] = useState<typeof OGUNLER[number] | ''>('Sabah');
  const [tip, setTip] = useState<typeof TIPLER[number] | ''>('');
  const [notlar, setNotlar] = useState('');
  const [saving, setSaving] = useState(false);

  const kayitlar = useLiveFarmQuery(() =>
    db.buzagiSutKayitlari.where('hayvanId').equals(hayvan.id).sortBy('tarih')
  ) || [];

  // Son 14 günün kayıtları (en yeni önce)
  const sortedKayitlar = useMemo(() =>
    [...kayitlar].sort((a, b) => b.tarih.localeCompare(a.tarih)),
    [kayitlar]
  );

  // Özet hesaplar
  const toplamLt = kayitlar.reduce((s, k) => s + k.miktarLt, 0);
  const ortalamaGunlukLt = kayitlar.length > 0
    ? (() => {
        const gunler = new Set(kayitlar.map(k => k.tarih)).size;
        return Math.round((toplamLt / gunler) * 10) / 10;
      })()
    : 0;

  const handleSave = async () => {
    if (!miktarLt || Number(miktarLt) <= 0) return;
    setSaving(true);
    const payload: BuzagiSutKaydi = {
      id: uuidv4(),
      hayvanId: hayvan.id,
      tarih,
      miktarLt: Number(miktarLt),
      ogun: ogun || undefined,
      tip: (tip || undefined) as BuzagiSutKaydi['tip'],
      notlar: notlar.trim() || undefined,
    };
    await db.buzagiSutKayitlari.add(payload);
    await db.syncQueue.add({ table: 'buzagiSutKayitlari', action: 'INSERT', payload, created_at: Date.now() });
    if (navigator.onLine) {
      const { processSyncQueue } = await import('../services/syncService');
      processSyncQueue();
    }
    // Formu sıfırla (tarih kalacak)
    setMiktarLt('');
    setNotlar('');
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu süt kaydını silmek istediğinize emin misiniz?')) return;
    await db.buzagiSutKayitlari.delete(id);
    await db.syncQueue.add({ table: 'buzagiSutKayitlari', action: 'DELETE', payload: { id }, created_at: Date.now() });
  };

  // Günlük toplam — aynı gün birden fazla öğün varsa topla
  const gunlukToplam = useMemo(() => {
    const map: Record<string, number> = {};
    for (const k of kayitlar) {
      map[k.tarih] = (map[k.tarih] || 0) + k.miktarLt;
    }
    return map;
  }, [kayitlar]);

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Başlık */}
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
          <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300">
            <Droplet className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-black">Süt / Mama Kaydı</h2>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{hayvan.kupeNo} — {hayvan.irk}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Sol Kolon: Form */}
          <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-earth-100 dark:border-gray-700">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Tarih */}
                <div>
                  <label className="text-xs font-bold text-earth-600 dark:text-gray-400 mb-1 block uppercase tracking-wide">Tarih</label>
                  <input
                    type="date"
                    value={tarih}
                    onChange={e => setTarih(e.target.value)}
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                {/* Miktar */}
                <div>
                  <label className="text-xs font-bold text-earth-600 dark:text-gray-400 mb-1 block uppercase tracking-wide">Miktar (Litre)</label>
                  <input
                    type="number" step="0.5" min="0"
                    value={miktarLt}
                    onChange={e => setMiktarLt(e.target.value)}
                    placeholder="Örn: 3"
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
              </div>

              {/* Öğün Seçimi */}
              <div>
                <label className="text-xs font-bold text-earth-600 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Öğün</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {OGUNLER.map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOgun(ogun === o ? '' : o)}
                      className={`py-1.5 rounded-lg border text-xs font-bold transition
                        ${ogun === o
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-earth-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip Seçimi */}
              <div>
                <label className="text-xs font-bold text-earth-600 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Süt Tipi</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIPLER.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTip(tip === t ? '' : t)}
                      className={`py-1.5 rounded-lg border text-xs font-bold transition
                        ${tip === t
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-earth-200 dark:border-gray-700 hover:border-green-300'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Not (opsiyonel) */}
              <div>
                <label className="text-xs font-bold text-earth-600 dark:text-gray-400 mb-1 block uppercase tracking-wide">Not (opsiyonel)</label>
                <input
                  type="text"
                  value={notlar}
                  onChange={e => setNotlar(e.target.value)}
                  placeholder="Örn: İştahsızdı, yarısını içti"
                  className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-earth-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !miktarLt || Number(miktarLt) <= 0}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-40 transition"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Kaydediliyor...' : 'Kayıt Ekle'}</span>
              </button>
            </div>
          </div>

          {/* Sağ Kolon: KPI ve Geçmiş Kayıtlar */}
          <div className="w-full md:w-1/2 flex flex-col bg-earth-50 dark:bg-gray-900/50">
            {/* Özet KPI'lar */}
            {kayitlar.length > 0 && (
              <div className="p-4 pb-0 grid grid-cols-3 gap-3 flex-shrink-0">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800/40">
                  <div className="text-xl font-black text-blue-700 dark:text-blue-400">{kayitlar.length}</div>
                  <div className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Kayıt</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-100 dark:border-green-800/40">
                  <div className="text-xl font-black text-green-700 dark:text-green-400">{Math.round(toplamLt * 10) / 10} L</div>
                  <div className="text-xs text-green-600/70 dark:text-green-400/70 font-medium">Toplam</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-800/40">
                  <div className="text-xl font-black text-purple-700 dark:text-purple-400">{ortalamaGunlukLt} L</div>
                  <div className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium">Günlük Ort.</div>
                </div>
              </div>
            )}

            {/* Geçmiş Kayıtlar */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center space-x-2 pb-3 mb-2 border-b border-earth-100 dark:border-gray-700">
                <Calendar className="w-4 h-4 text-earth-400 dark:text-gray-500" />
                <span className="text-xs font-black text-earth-500 dark:text-gray-400 uppercase tracking-wide">
                  Geçmiş Kayıtlar ({sortedKayitlar.length})
                </span>
              </div>

              {sortedKayitlar.length === 0 ? (
                <div className="text-center py-8 text-earth-300 dark:text-gray-600">
                  <Droplet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Henüz süt kaydı yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedKayitlar.map((k, idx) => {
                    const isFirstOfDay = idx === 0 || sortedKayitlar[idx - 1].tarih !== k.tarih;
                    const dayTotal = gunlukToplam[k.tarih];
                    return (
                      <React.Fragment key={k.id}>
                        {/* Gün başlığı */}
                        {isFirstOfDay && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-black text-earth-500 dark:text-gray-400">
                              {new Date(k.tarih + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span className="flex items-center space-x-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                              <TrendingUp className="w-3 h-3" />
                              <span>Gün top.: {dayTotal} L</span>
                            </span>
                          </div>
                        )}
                        {/* Kayıt satırı */}
                        <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 rounded-xl p-2.5 border border-earth-100 dark:border-gray-700 shadow-sm">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Droplet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-earth-900 dark:text-gray-100 text-sm">{k.miktarLt} L</span>
                              {k.ogun && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded font-bold">{k.ogun}</span>
                              )}
                              {k.tip && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded font-bold">{k.tip}</span>
                              )}
                            </div>
                            {k.notlar && (
                              <p className="text-xs text-earth-500 dark:text-gray-400 mt-0.5 truncate">{k.notlar}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(k.id)}
                            className="p-1.5 text-earth-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0"
                            title="Kaydı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalfMilkModal;
