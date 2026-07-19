import React, { useState } from 'react';
import { X, Save, Wallet } from 'lucide-react';
import { db } from '../lib/db';
import type { EkFinansalIslem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  onClose: () => void;
}

const FinancialTransactionModal: React.FC<Props> = ({ onClose }) => {
  const [tip, setTip] = useState<'Gelir' | 'Gider'>('Gider');
  const [kategori, setKategori] = useState<'Ek Gelir' | 'Ek Gider'>('Ek Gider');
  const [miktar, setMiktar] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [aciklama, setAciklama] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTipChange = (newTip: 'Gelir' | 'Gider') => {
    setTip(newTip);
    setKategori(newTip === 'Gelir' ? 'Ek Gelir' : 'Ek Gider');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!miktar || isNaN(Number(miktar)) || Number(miktar) <= 0) return;

    setIsSubmitting(true);
    const payload: EkFinansalIslem = {
      id: uuidv4(),
      tarih: new Date(tarih).toISOString(),
      tip,
      kategori,
      miktar: Number(miktar),
      aciklama: aciklama || undefined,
    };

    try {
      await db.ekFinansalIslemler.add(payload);
      await db.syncQueue.add({
        table: 'ekFinansalIslemler',
        action: 'INSERT',
        payload,
        created_at: Date.now()
      });

      if (navigator.onLine) {
        const { processSyncQueue } = await import('../services/syncService');
        processSyncQueue();
      }
      onClose();
    } catch (error) {
      console.error('Kaydedilirken hata oluştu:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-earth-200 flex justify-between items-center bg-blue-50">
          <div className="flex items-center space-x-2 text-blue-800">
            <Wallet className="w-6 h-6" />
            <h2 className="text-xl font-black">Ek Gelir / Gider Ekle</h2>
          </div>
          <button onClick={onClose} className="text-earth-500 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTipChange('Gelir')}
              className={`py-2 px-4 rounded-xl font-bold border-2 transition ${tip === 'Gelir' ? 'bg-green-100 border-green-500 text-green-700' : 'border-earth-200 text-earth-500 hover:bg-earth-50'}`}
            >
              Gelir
            </button>
            <button
              type="button"
              onClick={() => handleTipChange('Gider')}
              className={`py-2 px-4 rounded-xl font-bold border-2 transition ${tip === 'Gider' ? 'bg-red-100 border-red-500 text-red-700' : 'border-earth-200 text-earth-500 hover:bg-earth-50'}`}
            >
              Gider
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-earth-700">Miktar (₺) *</label>
            <input
              type="number"
              required
              min="0.1"
              step="0.01"
              value={miktar}
              onChange={e => setMiktar(e.target.value)}
              className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500"
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-earth-700">Tarih *</label>
            <input
              type="date"
              required
              value={tarih}
              onChange={e => setTarih(e.target.value)}
              className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-earth-700">Açıklama (Opsiyonel)</label>
            <input
              type="text"
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500"
              placeholder="Elektrik faturası, hibe ödemesi vb."
              maxLength={100}
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-earth-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-earth-600 bg-earth-100 hover:bg-earth-200 rounded-lg transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 font-bold text-white bg-nature-600 hover:bg-nature-700 rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinancialTransactionModal;
