import React, { useState } from 'react';
import { X, ArrowDown, ArrowUp } from 'lucide-react';
import { db } from '../lib/db';
import type { Yem } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface FeedMovementModalProps {
  yem: Yem;
  onClose: () => void;
}

const FeedMovementModal: React.FC<FeedMovementModalProps> = ({ yem, onClose }) => {
  const [islemTuru, setIslemTuru] = useState<'GİRİŞ' | 'ÇIKIŞ'>('GİRİŞ');
  const [miktarKg, setMiktarKg] = useState<number | ''>('');
  const [aciklama, setAciklama] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!miktarKg || miktarKg <= 0) return;
    
    setIsSubmitting(true);
    const miktar = Number(miktarKg);

    const movementPayload = {
      id: uuidv4(),
      yemId: yem.id,
      islemTuru,
      miktarKg: miktar,
      islemTarihi: new Date().toISOString(),
      aciklama
    };

    // Calculate new stock
    const newStok = islemTuru === 'GİRİŞ' ? yem.stokKg + miktar : yem.stokKg - miktar;
    
    const yemUpdatePayload = { ...yem, stokKg: newStok };

    try {
      // 1. Add movement
      await db.yemHareketleri.add(movementPayload);
      await db.syncQueue.add({
        table: 'yemHareketleri',
        action: 'INSERT',
        payload: movementPayload,
        created_at: Date.now()
      });

      // 2. Update Feed stock
      await db.yemler.put(yemUpdatePayload);
      await db.syncQueue.add({
        table: 'yemler',
        action: 'UPDATE',
        payload: yemUpdatePayload,
        created_at: Date.now()
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert('İşlem kaydedilirken bir hata oluştu.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        
        <div className="p-4 border-b border-earth-200 flex justify-between items-center bg-nature-50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black text-earth-900">Stok Hareketi</h2>
            <p className="text-sm font-medium text-earth-600">{yem.ad}</p>
          </div>
          <button onClick={onClose} className="text-earth-500 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="flex space-x-2">
            <button 
              type="button"
              onClick={() => setIslemTuru('GİRİŞ')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition ${islemTuru === 'GİRİŞ' ? 'bg-nature-600 text-white shadow-md' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'}`}
            >
              <ArrowDown className="w-5 h-5" />
              <span>GİRİŞ (Alım)</span>
            </button>
            <button 
              type="button"
              onClick={() => setIslemTuru('ÇIKIŞ')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition ${islemTuru === 'ÇIKIŞ' ? 'bg-orange-500 text-white shadow-md' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'}`}
            >
              <ArrowUp className="w-5 h-5" />
              <span>ÇIKIŞ (Tüketim)</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Miktar (kg)</label>
            <input 
              required
              type="number" 
              min="0.1" 
              step="0.1"
              value={miktarKg}
              onChange={e => setMiktarKg(Number(e.target.value))}
              placeholder="0.0"
              className="w-full p-3 border border-earth-300 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none text-lg font-bold text-earth-900"
            />
            {islemTuru === 'ÇIKIŞ' && typeof miktarKg === 'number' && miktarKg > yem.stokKg && (
              <p className="text-red-500 text-xs mt-1 font-bold">Uyarı: Mevcut stoktan fazla çıkış yapıyorsunuz!</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Açıklama (Opsiyonel)</label>
            <textarea 
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              placeholder="Örn: X firmasından alındı / Sağmal grubuna verildi"
              className="w-full p-3 border border-earth-300 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none resize-none h-24"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-earth-600 font-bold hover:bg-earth-100 rounded-lg transition">İptal</button>
            <button disabled={isSubmitting} type="submit" className={`px-6 py-2 rounded-lg font-bold text-white transition ${islemTuru === 'GİRİŞ' ? 'bg-nature-600 hover:bg-nature-700' : 'bg-orange-500 hover:bg-orange-600'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
              Kaydet
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default FeedMovementModal;
