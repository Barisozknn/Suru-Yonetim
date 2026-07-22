import React, { useState } from 'react';
import { X, Search, CheckCircle } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { Grup } from '../types';

interface GroupAnimalManagerModalProps {
  grup: Grup;
  onClose: () => void;
}

const GroupAnimalManagerModal: React.FC<GroupAnimalManagerModalProps> = ({ grup, onClose }) => {
  const [aramaMetni, setAramaMetni] = useState('');

  // Sadece aktif hayvanları çek
  const aktifHayvanlar = useLiveFarmQuery(async () => {
    const tumHayvanlar = await db.hayvanlar.filter(h => h.durum === 'Aktif').toArray();
    return tumHayvanlar;
  }) || [];

  // Filtreleme (Grup türüne ve aramaya göre)
  const filtrelenmisHayvanlar = aktifHayvanlar.filter(h => {
    // Tür eşleşmesi: Grup 'Karma' değilse sadece o türdeki hayvanları göster
    const turEslesiyor = grup.tur === 'Karma' || h.tur === grup.tur;
    
    // Arama metni
    const aramaEslesiyor = h.kupeNo.toLowerCase().includes(aramaMetni.toLowerCase());

    return turEslesiyor && aramaEslesiyor;
  });

  const handleToggle = async (hayvanId: string, isCurrentlyInGroup: boolean) => {
    try {
      const yeniGrupId = isCurrentlyInGroup ? null : grup.id;
      
      await db.hayvanlar.update(hayvanId, { grupId: yeniGrupId });
      
      const updatedHayvan = await db.hayvanlar.get(hayvanId);
      if (updatedHayvan) {
        await db.syncQueue.add({
          table: 'hayvanlar',
          action: 'UPDATE',
          payload: updatedHayvan,
          created_at: Date.now()
        });
      }
    } catch (error) {
      console.error("Grup atanırken hata oluştu:", error);
      alert("Bir hata oluştu.");
    }
  };

  const gruptakiHayvanSayisi = aktifHayvanlar.filter(h => h.grupId === grup.id).length;

  return (
    <div className="fixed inset-0 bg-earth-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-earth-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-earth-800 dark:text-gray-200">{grup.ad} - Hayvan Ekle/Çıkar</h2>
            <p className="text-sm text-earth-500 dark:text-gray-400">
              Şu an grupta {gruptakiHayvanSayisi} hayvan bulunuyor. {grup.tur !== 'Karma' && `(Sadece ${grup.tur} türleri eklenebilir)`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-earth-100 dark:hover:bg-gray-700 rounded-full transition">
            <X className="w-6 h-6 text-earth-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 border-b border-earth-100 dark:border-gray-700 bg-earth-50 dark:bg-gray-900">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" />
            <input
              type="text"
              placeholder="Küpe No ile hayvan ara..."
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-nature-500 outline-none"
            />
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {filtrelenmisHayvanlar.length === 0 ? (
            <div className="text-center text-earth-500 dark:text-gray-400 py-8">
              Kriterlere uygun aktif hayvan bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtrelenmisHayvanlar.map(hayvan => {
                const isCurrentlyInGroup = hayvan.grupId === grup.id;
                const isOtherGroup = !!hayvan.grupId && hayvan.grupId !== grup.id;

                return (
                  <div 
                    key={hayvan.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition cursor-pointer select-none
                      ${isCurrentlyInGroup 
                        ? 'border-nature-500 bg-nature-50 dark:bg-nature-900/30' 
                        : 'border-earth-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-earth-300'
                      }
                    `}
                    onClick={() => handleToggle(hayvan.id, isCurrentlyInGroup)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-6 h-6 rounded border flex items-center justify-center
                        ${isCurrentlyInGroup ? 'bg-nature-500 border-nature-500' : 'border-earth-300 dark:border-gray-600 bg-white dark:bg-gray-800'}
                      `}>
                        {isCurrentlyInGroup && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <div className="font-bold text-earth-800 dark:text-gray-200">{hayvan.kupeNo}</div>
                        <div className="text-xs text-earth-500 dark:text-gray-400">{hayvan.tur} • {hayvan.cinsiyet}</div>
                        {isOtherGroup && (
                          <div className="text-xs font-semibold text-orange-500 mt-0.5">
                            Başka bir gruba kayıtlı
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-earth-100 dark:border-gray-700 bg-earth-50 dark:bg-gray-900 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-earth-800 text-white rounded-xl font-semibold hover:bg-earth-900 transition">
            Tamamlandı
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupAnimalManagerModal;
