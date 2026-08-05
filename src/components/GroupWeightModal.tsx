import React, { useState } from 'react';
import { X, Save, Scale } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { Grup, AgirlikKaydi } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  grup: Grup;
  onClose: () => void;
}

const GroupWeightModal: React.FC<Props> = ({ grup, onClose }) => {
  const hayvanlar = useLiveFarmQuery(() => 
    db.hayvanlar.where('grupId').equals(grup.id).toArray()
  ) || [];

  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [kayitlar, setKayitlar] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (hayvanId: string, value: string) => {
    const num = value === '' ? undefined : Number(value);
    setKayitlar(prev => ({
      ...prev,
      [hayvanId]: num as number
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const payloads: AgirlikKaydi[] = Object.keys(kayitlar)
        .filter(id => kayitlar[id] !== undefined && kayitlar[id] > 0)
        .map(hayvanId => ({
          id: uuidv4(),
          hayvanId,
          tarih,
          kg: kayitlar[hayvanId]
      }));

      if (payloads.length === 0) {
        alert("En az bir hayvan için ağırlık miktarı (kg) giriniz.");
        setIsSubmitting(false);
        return;
      }

      await db.agirlikKayitlari.bulkAdd(payloads);
      
      // Update actual current weight on the animal profile
      for (const payload of payloads) {
        const h = await db.hayvanlar.get(payload.hayvanId);
        if (h) {
          await db.hayvanlar.update(h.id, { guncelAgirlikKg: payload.kg });
        }
      }

      // Senkronizasyon kuyruğuna ekle
      for (const payload of payloads) {
        await db.syncQueue.add({
          table: 'agirlikKayitlari',
          action: 'INSERT',
          payload,
          created_at: Date.now()
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Kaydedilirken hata oluştu.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-green-900/20 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Scale className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h2 className="text-xl font-black text-green-900">Toplu Tartım Girişi</h2>
              <p className="text-sm font-bold text-green-700 dark:text-green-400">{grup.ad}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-earth-200 dark:border-gray-700 bg-earth-50 dark:bg-gray-900">
          <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Tartım Tarihi</label>
          <input 
            type="date" 
            value={tarih} 
            onChange={e => setTarih(e.target.value)} 
            className="w-full max-w-xs p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" 
          />
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-earth-50/50">
          {hayvanlar.length === 0 ? (
            <div className="text-center py-8 text-earth-500 dark:text-gray-400 italic">
              Bu grupta hayvan bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Başlıklar */}
              <div className="flex items-center px-3 pb-2 text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="flex-1">Küpe No / Tür</div>
                <div className="w-32 px-1 text-center text-green-600 dark:text-green-400">Ağırlık (Kg)*</div>
              </div>

              {hayvanlar.map(h => (
                <div key={h.id} className="flex items-center p-3 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-green-300 transition">
                  <div className="flex-1">
                    <h4 className="font-bold text-earth-900 dark:text-gray-100">{h.kupeNo}</h4>
                    <span className="text-xs text-earth-500 dark:text-gray-400">{h.tur} - {h.irk}</span>
                  </div>
                  
                  <div className="w-32 px-1">
                    <input type="number" step="1" min="0" placeholder="Kg" 
                      value={kayitlar[h.id] || ''} onChange={e => handleInputChange(h.id, e.target.value)}
                      className="w-full p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center font-bold text-green-900 bg-green-50 dark:bg-green-900/20" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-earth-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={isSubmitting || Object.keys(kayitlar).length === 0}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition shadow-sm"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Kaydediliyor...' : 'Tümünü Kaydet'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default GroupWeightModal;
