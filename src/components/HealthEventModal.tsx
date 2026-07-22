import React, { useState } from 'react';
import { X, Save, Syringe, Stethoscope, Pill, Scissors, FileText } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { SaglikOlayi, SaglikOlayiTur } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  hayvanId: string;
  onClose: () => void;
  existing?: SaglikOlayi;
}

const TUR_ICONS: Record<SaglikOlayiTur, React.ReactNode> = {
  'Muayene': <Stethoscope className="w-4 h-4" />,
  'Aşı': <Syringe className="w-4 h-4" />,
  'İlaç': <Pill className="w-4 h-4" />,
  'Operasyon': <Scissors className="w-4 h-4" />,
  'Diğer': <FileText className="w-4 h-4" />,
};

const TUR_COLORS: Record<SaglikOlayiTur, string> = {
  'Muayene': 'bg-nature-100 dark:bg-nature-900/50 text-nature-700 dark:text-nature-300 border-nature-300',
  'Aşı': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-300',
  'İlaç': 'bg-orange-100 text-orange-700 border-orange-300',
  'Operasyon': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-300',
  'Diğer': 'bg-earth-100 dark:bg-gray-800 text-earth-700 dark:text-gray-300 border-earth-300 dark:border-gray-600',
};

const HealthEventModal: React.FC<Props> = ({ hayvanId, onClose, existing }) => {
  const today = new Date().toISOString().split('T')[0];
  const [tarih, setTarih] = useState(existing?.tarih || today);
  const [tur, setTur] = useState<SaglikOlayiTur>(existing?.tur || 'Muayene');
  const [ilacAdi, setIlacAdi] = useState(existing?.ilacAdi || '');
  const [aciklama, setAciklama] = useState(existing?.aciklama || '');
  const [arinmaSuresiGun, setArinmaSuresiGun] = useState(existing?.arinmaSuresiGun || 0);
  const [maliyet, setMaliyet] = useState(existing?.maliyet?.toString() || '');
  const [isKisirlastirma, setIsKisirlastirma] = useState(existing?.detaylar?.kisirlastirma || false);
  const [saving, setSaving] = useState(false);

  const hayvan = useLiveFarmQuery(() => db.hayvanlar.get(hayvanId), [hayvanId]);

  const handleSave = async () => {
    if (!aciklama.trim()) {
      alert('Açıklama zorunludur.');
      return;
    }
    setSaving(true);
    const payload: SaglikOlayi = {
      id: existing?.id || uuidv4(),
      hayvanId,
      tarih,
      tur,
      ilacAdi: (tur === 'Aşı' || tur === 'İlaç') ? ilacAdi : undefined,
      aciklama,
      arinmaSuresiGun,
      maliyet: maliyet ? Number(maliyet) : undefined,
      detaylar: tur === 'Operasyon' && isKisirlastirma ? { ...existing?.detaylar, kisirlastirma: true } : existing?.detaylar,
    };

    const action = existing ? 'UPDATE' : 'INSERT';
    if (existing) {
      await db.saglikOlaylari.put(payload);
    } else {
      await db.saglikOlaylari.add(payload);
    }
    await db.syncQueue.add({ table: 'saglikOlaylari', action, payload, created_at: Date.now() });

    if (tur === 'Operasyon' && isKisirlastirma && hayvan && !hayvan.kisirlastirildiMi) {
      await db.hayvanlar.update(hayvanId, { kisirlastirildiMi: true });
      const updatedHayvan = await db.hayvanlar.get(hayvanId);
      if (updatedHayvan) {
        await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
      }
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-nature-50 dark:bg-nature-900/30 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-xl font-black text-earth-900 dark:text-gray-100">Sağlık Olayı</h2>
            <p className="text-xs text-earth-500 dark:text-gray-400">{existing ? 'Kaydı Düzenle' : 'Yeni Kayıt Ekle'}</p>
          </div>
          <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Tür Seçimi */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-2 block">Olay Türü</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TUR_ICONS) as SaglikOlayiTur[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTur(t)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm transition ${
                    tur === t ? TUR_COLORS[t] + ' ring-2 ring-offset-1 ring-current' : 'bg-earth-50 dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-earth-200 dark:border-gray-700 hover:bg-earth-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {TUR_ICONS[t]}
                  <span>{t}</span>
                </button>
              ))}
            </div>
            {tur === 'Operasyon' && hayvan?.cinsiyet === 'Erkek' && (
              <div className="flex items-center space-x-2 mt-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800/50">
                <input 
                  type="checkbox" 
                  id="kisirlastirma" 
                  checked={isKisirlastirma} 
                  onChange={e => setIsKisirlastirma(e.target.checked)} 
                  className="w-4 h-4 text-red-600 dark:text-red-400 border-red-300 rounded focus:ring-red-500" 
                />
                <label htmlFor="kisirlastirma" className="text-sm font-bold text-red-800">
                  Bu bir "Kısırlaştırma" operasyonudur
                </label>
              </div>
            )}
          </div>

          {/* Tarih */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Tarih</label>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500" />
          </div>

          {/* İlaç/Aşı Adı */}
          {(tur === 'Aşı' || tur === 'İlaç') && (
            <div>
              <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">
                {tur === 'Aşı' ? 'Aşı Adı' : 'İlaç Adı'}
              </label>
              <input type="text" value={ilacAdi} onChange={e => setIlacAdi(e.target.value)}
                placeholder={tur === 'Aşı' ? 'Örn: Bovilis IBR' : 'Örn: Oxytetracycline'}
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500" />
            </div>
          )}

          {/* Arınma Süresi */}
          {(tur === 'İlaç' || tur === 'Operasyon') && (
            <div>
              <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">
                Arınma Süresi (Gün) — 0 = arınma yok
              </label>
              <input type="number" min={0} value={arinmaSuresiGun} onChange={e => setArinmaSuresiGun(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500" />
            </div>
          )}

          {/* Açıklama */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Açıklama *</label>
            <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} rows={3}
              placeholder="Muayene bulguları, doz miktarı, hekim adı..."
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500 resize-none" />
          </div>

          {/* Maliyet */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Maliyet (₺) — İsteğe Bağlı</label>
            <input type="number" min={0} value={maliyet} onChange={e => setMaliyet(e.target.value)}
              placeholder="Örn: 500"
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-nature-500" />
          </div>
        </div>

        <div className="p-4 border-t border-earth-200 dark:border-gray-700 flex justify-end space-x-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-earth-600 dark:text-gray-400 font-bold hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg transition">İptal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-nature-600 text-white rounded-lg font-bold hover:bg-nature-700 disabled:opacity-50 transition">
            <Save className="w-5 h-5" />
            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HealthEventModal;
