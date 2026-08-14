import React, { useState } from 'react';
import { X, Save, Droplet } from 'lucide-react';
import { db } from '../lib/db';
import type { BuzagiSutKaydi, Hayvan } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  buzagilar: Hayvan[];
  onClose: () => void;
}

const OGUNLER = ['Sabah', 'Öğle', 'Akşam', 'Gece'] as const;
const TIPLER = ['Tam Süt', 'Süt İkamesi', 'Karma'] as const;

const BulkMilkModal: React.FC<Props> = ({ buzagilar, onClose }) => {
  const bugun = new Date().toISOString().split('T')[0];

  const [tarih, setTarih] = useState(bugun);
  const [miktarLt, setMiktarLt] = useState('');
  const [ogun, setOgun] = useState<typeof OGUNLER[number] | ''>('Sabah');
  const [tip, setTip] = useState<typeof TIPLER[number] | ''>('');
  const [notlar, setNotlar] = useState('');
  const [saving, setSaving] = useState(false);

  // Seçili buzağılar (varsayılan: tümü seçili)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(buzagilar.map(b => b.id))
  );

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => setSelectedIds(new Set(buzagilar.map(b => b.id)));
  const selectNone = () => setSelectedIds(new Set());

  const handleSave = async () => {
    if (!miktarLt || Number(miktarLt) <= 0 || selectedIds.size === 0) return;
    setSaving(true);

    const now = Date.now();
    for (const id of selectedIds) {
      const payload: BuzagiSutKaydi = {
        id: uuidv4(),
        hayvanId: id,
        tarih,
        miktarLt: Number(miktarLt),
        ogun: ogun || undefined,
        tip: (tip || undefined) as BuzagiSutKaydi['tip'],
        notlar: notlar.trim() || undefined,
      };
      await db.buzagiSutKayitlari.add(payload);
      await db.syncQueue.add({ table: 'buzagiSutKayitlari', action: 'INSERT', payload, created_at: now });
    }

    if (navigator.onLine) {
      const { processSyncQueue } = await import('../services/syncService');
      processSyncQueue();
    }
    
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Başlık */}
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20 flex-shrink-0">
          <div className="flex items-center space-x-2 text-green-800 dark:text-green-300">
            <Droplet className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-black">Toplu Süt / Mama Kaydı</h2>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">Aynı anda birden fazla buzağıya süt kaydı girin</p>
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
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                {/* Miktar */}
                <div>
                  <label className="text-xs font-bold text-earth-600 dark:text-gray-400 mb-1 block uppercase tracking-wide">Kişi Başı (Litre)</label>
                  <input
                    type="number" step="0.5" min="0"
                    value={miktarLt}
                    onChange={e => setMiktarLt(e.target.value)}
                    placeholder="Örn: 3"
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-gray-100 text-sm"
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
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-earth-200 dark:border-gray-700 hover:border-green-300'
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
                  placeholder="Toplu not (Örn: Sabah sütü)"
                  className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-900 dark:text-gray-100 text-sm"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-earth-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={saving || !miktarLt || Number(miktarLt) <= 0 || selectedIds.size === 0}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-40 transition"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Kaydediliyor...' : `${selectedIds.size} Kayıt Ekle`}</span>
              </button>
            </div>
          </div>

          {/* Sağ Kolon: Buzağı Seçimi */}
          <div className="w-full md:w-1/2 flex flex-col bg-earth-50 dark:bg-gray-900/50">
            <div className="p-4 pb-2 flex justify-between items-center border-b border-earth-100 dark:border-gray-700 flex-shrink-0">
              <span className="text-xs font-black text-earth-600 dark:text-gray-400 uppercase tracking-wide">
                Seçili Buzağılar ({selectedIds.size}/{buzagilar.length})
              </span>
              <div className="space-x-2">
                <button onClick={selectAll} className="text-xs font-bold text-blue-600 hover:text-blue-700">Tümü</button>
                <span className="text-earth-300 dark:text-gray-600">|</span>
                <button onClick={selectNone} className="text-xs font-bold text-red-600 hover:text-red-700">Hiçbiri</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-1 gap-1.5">
                {buzagilar.map(b => (
                  <label
                    key={b.id}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedIds.has(b.id)
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/40'
                        : 'bg-white border-earth-200 dark:bg-gray-800 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(b.id)}
                      onChange={() => toggleSelection(b.id)}
                      className="w-4 h-4 text-green-600 rounded border-earth-300 focus:ring-green-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-earth-900 dark:text-gray-100 truncate">{b.kupeNo}</div>
                      <div className="text-xs text-earth-500 dark:text-gray-400">{b.irk}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BulkMilkModal;
