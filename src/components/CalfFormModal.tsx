import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { PiCow } from 'react-icons/pi';
import { db } from '../lib/db';
import type { BuzagiKaydi } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  hayvanId: string;
  onClose: () => void;
}

const CalfFormModal: React.FC<Props> = ({ hayvanId, onClose }) => {
  const [kayit, setKayit] = useState<BuzagiKaydi | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [dogumAgirligiKg, setDogumAgirligiKg] = useState('');
  const [agizSutuVerildi, setAgizSutuVerildi] = useState(false);
  const [agizSutuMiktarLt, setAgizSutuMiktarLt] = useState('');
  const [agizSutuSaatSonra, setAgizSutuSaatSonra] = useState('');
  const [hedefSuttenKesimTarihi, setHedefSuttenKesimTarihi] = useState('');
  const [hedefSuttenKesimAgirligiKg, setHedefSuttenKesimAgirligiKg] = useState('');
  const [gerceklesenSuttenKesimTarihi, setGerceklesenSuttenKesimTarihi] = useState('');
  const [gerceklesenSuttenKesimAgirligiKg, setGerceklesenSuttenKesimAgirligiKg] = useState('');
  const [hedefGAAKgGun, setHedefGAAKgGun] = useState('');


  useEffect(() => {
    const fetchKayit = async () => {
      const existing = await db.buzagiKayitlari.where('hayvanId').equals(hayvanId).first();
      if (existing) {
        setKayit(existing);
        setDogumAgirligiKg(existing.dogumAgirligiKg?.toString() || '');
        setAgizSutuVerildi(existing.agizSutuVerildi);
        setAgizSutuMiktarLt(existing.agizSutuMiktarLt?.toString() || '');
        setAgizSutuSaatSonra(existing.agizSutuSaatSonra?.toString() || '');
        setHedefSuttenKesimTarihi(existing.hedefSuttenKesimTarihi || '');
        setHedefSuttenKesimAgirligiKg(existing.hedefSuttenKesimAgirligiKg?.toString() || '');
        setGerceklesenSuttenKesimTarihi(existing.gerceklesenSuttenKesimTarihi || '');
        setGerceklesenSuttenKesimAgirligiKg(existing.gerceklesenSuttenKesimAgirligiKg?.toString() || '');
        setHedefGAAKgGun(existing.hedefGAAKgGun?.toString() || '');

      }
      setLoading(false);
    };
    fetchKayit();
  }, [hayvanId]);

  const handleSave = async () => {
    setSaving(true);
    const payload: BuzagiKaydi = {
      id: kayit?.id || uuidv4(),
      hayvanId,
      dogumAgirligiKg: dogumAgirligiKg ? Number(dogumAgirligiKg) : undefined,
      agizSutuVerildi,
      agizSutuMiktarLt: agizSutuMiktarLt ? Number(agizSutuMiktarLt) : undefined,
      agizSutuSaatSonra: agizSutuSaatSonra ? Number(agizSutuSaatSonra) : undefined,
      hedefSuttenKesimTarihi: hedefSuttenKesimTarihi || undefined,
      hedefSuttenKesimAgirligiKg: hedefSuttenKesimAgirligiKg ? Number(hedefSuttenKesimAgirligiKg) : undefined,
      gerceklesenSuttenKesimTarihi: gerceklesenSuttenKesimTarihi || undefined,
      gerceklesenSuttenKesimAgirligiKg: gerceklesenSuttenKesimAgirligiKg ? Number(gerceklesenSuttenKesimAgirligiKg) : undefined,
      hedefGAAKgGun: hedefGAAKgGun ? Number(hedefGAAKgGun) : undefined,
    };

    const action = kayit ? 'UPDATE' : 'INSERT';
    if (kayit) {
      await db.buzagiKayitlari.put(payload);
    } else {
      await db.buzagiKayitlari.add(payload);
    }

    await db.syncQueue.add({ table: 'buzagiKayitlari', action, payload, created_at: Date.now() });

    // NOTLARA OTOMATİK EKLEME
    const hayvan = await db.hayvanlar.get(hayvanId);
    if (hayvan) {
      const noteHeader = `--- BUZAĞI BÜYÜTME ÖZETİ ---`;
      const ozet = `
${noteHeader}
Kolostrum (Ağız Sütü): ${agizSutuVerildi ? `Verildi (${agizSutuMiktarLt || '-'} Lt, Doğumdan ${agizSutuSaatSonra || '-'} Saat Sonra)` : 'Verilmedi'}
Sütten Kesim Hedefi: ${hedefSuttenKesimTarihi ? new Date(hedefSuttenKesimTarihi).toLocaleDateString('tr-TR') : '-'} | ${hedefSuttenKesimAgirligiKg || '-'} Kg
Gerçekleşen Sütten Kesim: ${gerceklesenSuttenKesimTarihi ? new Date(gerceklesenSuttenKesimTarihi).toLocaleDateString('tr-TR') : '-'} | ${gerceklesenSuttenKesimAgirligiKg || '-'} Kg
Hedef GAA: ${hedefGAAKgGun || '-'} kg/gün
----------------------------`.trim();

      let currentNotes = hayvan.notlar || '';
      // Eski özet varsa bul ve temizle (üzerine yazmak için)
      if (currentNotes.includes(noteHeader)) {
        const regex = new RegExp(`--- BUZAĞI BÜYÜTME ÖZETİ ---[\\s\\S]*?----------------------------`, 'g');
        currentNotes = currentNotes.replace(regex, '').trim();
      }

      hayvan.notlar = currentNotes ? `${currentNotes}\n\n${ozet}` : ozet;
      await db.hayvanlar.put(hayvan);
      await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: hayvan, created_at: Date.now() });
    }

    if (navigator.onLine) {
      const { processSyncQueue } = await import('../services/syncService');
      processSyncQueue();
    }
    setSaving(false);
    onClose();
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-300">
            <PiCow className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-black">Buzağı Büyütme Kaydı</h2>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 opacity-80">Ağız sütü ve sütten kesim hedefleri</p>
            </div>
          </div>
          <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sol Kolon */}
            <div className="space-y-6">
              {/* Doğum Ağırlığı */}
              <div>
                <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Doğum Ağırlığı (kg)</label>
                <input type="number" step="0.1" value={dogumAgirligiKg} onChange={e => setDogumAgirligiKg(e.target.value)}
                  className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
              </div>

              <hr className="border-earth-100 dark:border-gray-700" />

              {/* Ağız Sütü */}
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-earth-50 dark:bg-gray-900 p-3 rounded-xl border border-earth-100 dark:border-gray-700">
                  <span className="font-bold text-earth-800 dark:text-gray-200">Ağız Sütü Verildi</span>
                  <button
                    type="button"
                    onClick={() => setAgizSutuVerildi(!agizSutuVerildi)}
                    className={`w-12 h-6 rounded-full transition relative ${agizSutuVerildi ? 'bg-green-500' : 'bg-earth-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${agizSutuVerildi ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {agizSutuVerildi && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Miktar (Litre)</label>
                      <input type="number" step="0.1" value={agizSutuMiktarLt} onChange={e => setAgizSutuMiktarLt(e.target.value)}
                        placeholder="Örn: 2" className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Kaç Saat Sonra?</label>
                      <input type="number" value={agizSutuSaatSonra} onChange={e => setAgizSutuSaatSonra(e.target.value)}
                        placeholder="Örn: 1" className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sağ Kolon */}
            <div className="space-y-6">
              {/* Sütten Kesim Hedefleri */}
              <div className="space-y-4">
                <h3 className="font-bold text-earth-800 dark:text-gray-200">Sütten Kesim Hedefleri</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Hedef Tarih</label>
                    <input type="date" value={hedefSuttenKesimTarihi} onChange={e => setHedefSuttenKesimTarihi(e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Hedef (kg)</label>
                    <input type="number" step="1" value={hedefSuttenKesimAgirligiKg} onChange={e => setHedefSuttenKesimAgirligiKg(e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
                  </div>
                </div>

                {/* Hedef GAA */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50">
                  <label className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1 block flex items-center space-x-1">
                    <span>🎯 Hedef GAA (kg/gün)</span>
                  </label>
                  <input
                    type="number" step="0.05" min="0" max="5"
                    value={hedefGAAKgGun}
                    onChange={e => setHedefGAAKgGun(e.target.value)}
                    placeholder="Örn: 0.80"
                    className="w-full p-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1.5 leading-tight">
                    Tipik: Holstein 0.80 • Jersey 0.65 • Angus 0.90
                  </p>
                </div>
              </div>

              <hr className="border-earth-100 dark:border-gray-700" />

              {/* Sütten Kesim Gerçekleşen */}
              <div className="space-y-4 bg-earth-50 dark:bg-gray-900 p-4 rounded-xl border border-earth-100 dark:border-gray-700">
                <h3 className="font-bold text-earth-800 dark:text-gray-200">Gerçekleşen Sütten Kesim</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Tarih</label>
                    <input type="date" value={gerceklesenSuttenKesimTarihi} onChange={e => setGerceklesenSuttenKesimTarihi(e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Ağırlık (kg)</label>
                    <input type="number" step="1" value={gerceklesenSuttenKesimAgirligiKg} onChange={e => setGerceklesenSuttenKesimAgirligiKg(e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-earth-200 dark:border-gray-700 flex justify-end space-x-3 flex-shrink-0 bg-white dark:bg-gray-800">
          <button onClick={onClose} className="px-5 py-2 text-earth-600 dark:text-gray-400 font-bold hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg transition">İptal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            <Save className="w-5 h-5" />
            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalfFormModal;
