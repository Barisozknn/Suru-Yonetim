import React, { useState } from 'react';
import { X, Save, Droplet } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { Grup, SutKaydi } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  grup: Grup;
  onClose: () => void;
}

const GroupMilkModal: React.FC<Props> = ({ grup, onClose }) => {
  const hayvanlar = useLiveFarmQuery(() => 
    db.hayvanlar.where('grupId').equals(grup.id).filter(h => h.tur === 'İnek' && h.cinsiyet === 'Dişi').toArray()
  ) || [];

  interface SutVeri {
    litre?: number;
    yagYuzde?: number;
    proteinYuzde?: number;
    laktozYuzde?: number;
    somatikHucre?: number;
  }

  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [kayitlar, setKayitlar] = useState<Record<string, SutVeri>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (hayvanId: string, field: keyof SutVeri, value: string) => {
    const num = value === '' ? undefined : Number(value);
    setKayitlar(prev => ({
      ...prev,
      [hayvanId]: {
        ...(prev[hayvanId] || {}),
        [field]: num
      }
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const payloads: SutKaydi[] = Object.keys(kayitlar)
        .filter(id => kayitlar[id]?.litre !== undefined && kayitlar[id].litre! > 0)
        .map(hayvanId => ({
          id: uuidv4(),
          hayvanId,
          tarih,
          litre: kayitlar[hayvanId].litre!,
          yagYuzde: kayitlar[hayvanId].yagYuzde,
          proteinYuzde: kayitlar[hayvanId].proteinYuzde,
          laktozYuzde: kayitlar[hayvanId].laktozYuzde,
          somatikHucre: kayitlar[hayvanId].somatikHucre
      }));

      if (payloads.length === 0) {
        alert("En az bir hayvan için süt miktarı (Litre) giriniz.");
        setIsSubmitting(false);
        return;
      }

      await db.sutKayitlari.bulkAdd(payloads);
      
      // Senkronizasyon kuyruğuna ekle
      for (const payload of payloads) {
        await db.syncQueue.add({
          table: 'sutKayitlari',
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
        
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Droplet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-black text-blue-900">Toplu Süt Girişi</h2>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{grup.ad}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-earth-200 dark:border-gray-700 bg-earth-50 dark:bg-gray-900">
          <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Sağım Tarihi</label>
          <input 
            type="date" 
            value={tarih} 
            onChange={e => setTarih(e.target.value)} 
            className="w-full max-w-xs p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
          />
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-earth-50/50">
          {hayvanlar.length === 0 ? (
            <div className="text-center py-8 text-earth-500 dark:text-gray-400 italic">
              Bu grupta sağmal (dişi sığır) bulunmuyor.
            </div>
          ) : (
            <div className="space-y-3 min-w-[700px]">
              {/* Başlıklar */}
              <div className="flex items-center px-3 pb-2 text-xs font-bold text-earth-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="w-48 flex-shrink-0">Küpe No / Irk</div>
                <div className="w-24 px-1 text-center text-blue-600 dark:text-blue-400">Miktar (L)*</div>
                <div className="w-24 px-1 text-center">Yağ (%)</div>
                <div className="w-24 px-1 text-center">Protein (%)</div>
                <div className="w-24 px-1 text-center">Laktoz (%)</div>
                <div className="w-28 px-1 text-center">SHS</div>
              </div>

              {hayvanlar.map(h => (
                <div key={h.id} className="flex items-center p-3 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-blue-300 transition">
                  <div className="w-48 flex-shrink-0">
                    <h4 className="font-bold text-earth-900 dark:text-gray-100">{h.kupeNo}</h4>
                    <span className="text-xs text-earth-500 dark:text-gray-400">{h.irk}</span>
                  </div>
                  
                  <div className="w-24 px-1">
                    <input type="number" step="0.1" min="0" placeholder="Litre" 
                      value={kayitlar[h.id]?.litre || ''} onChange={e => handleInputChange(h.id, 'litre', e.target.value)}
                      className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold text-blue-900 bg-blue-50 dark:bg-blue-900/20" />
                  </div>
                  
                  <div className="w-24 px-1">
                    <input type="number" step="0.1" min="0" max="10" placeholder="Yağ" 
                      value={kayitlar[h.id]?.yagYuzde || ''} onChange={e => handleInputChange(h.id, 'yagYuzde', e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm" />
                  </div>
                  
                  <div className="w-24 px-1">
                    <input type="number" step="0.1" min="0" max="10" placeholder="Protein" 
                      value={kayitlar[h.id]?.proteinYuzde || ''} onChange={e => handleInputChange(h.id, 'proteinYuzde', e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm" />
                  </div>

                  <div className="w-24 px-1">
                    <input type="number" step="0.1" min="0" max="10" placeholder="Laktoz" 
                      value={kayitlar[h.id]?.laktozYuzde || ''} onChange={e => handleInputChange(h.id, 'laktozYuzde', e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm" />
                  </div>

                  <div className="w-28 px-1">
                    <input type="number" min="0" placeholder="SHS" 
                      value={kayitlar[h.id]?.somatikHucre || ''} onChange={e => handleInputChange(h.id, 'somatikHucre', e.target.value)}
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-sm" />
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-earth-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex justify-end space-x-3">
          <button onClick={onClose} className="px-5 py-2 text-earth-600 dark:text-gray-400 font-bold hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg transition">İptal</button>
          <button 
            disabled={isSubmitting || hayvanlar.length === 0} 
            onClick={handleSave} 
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Save className="w-5 h-5" />
            <span>Kayıtları İşle</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default GroupMilkModal;
