import React, { useState } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import type { Hayvan, UremeKaydiTur } from '../types';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';

interface Props {
  hayvan: Hayvan;
  onClose: () => void;
}

const MaleReproductionModal: React.FC<Props> = ({ hayvan, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tur, setTur] = useState<UremeKaydiTur>('Doğal Aşım');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [notlar, setNotlar] = useState('');
  const [maliyet, setMaliyet] = useState('');

  // Doğal Aşım alanları
  const [selectedDişiId, setSelectedDişiId] = useState('');
  const [elleGirisDisi, setElleGirisDisi] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Sperma Alımı alanları
  const [miktarMl, setMiktarMl] = useState('');
  const [motiliteYuzde, setMotiliteYuzde] = useState('');
  const [payetSayisi, setPayetSayisi] = useState('');

  // Damızlık Muayenesi alanları
  const [skrotumCevresiCm, setSkrotumCevresiCm] = useState('');

  const disiHayvanlar = useLiveQuery(() => 
    db.hayvanlar.filter(h => h.cinsiyet === 'Dişi' && h.durum === 'Aktif' && (h.tur === 'İnek' || h.tur === 'Düve')).toArray()
  ) || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let detaylar: any = {};
      
      if (tur === 'Doğal Aşım') {
        let inekAdi = elleGirisDisi;
        if (selectedDişiId) {
           const secilen = disiHayvanlar.find(h => h.id === selectedDişiId);
           if (secilen) {
             inekAdi = secilen.kupeNo;
             detaylar.eslesilenDişiId = secilen.id;
           }
        }
        detaylar.eslesilenInek = inekAdi;
      } else if (tur === 'Sperma Alımı') {
        if (miktarMl) detaylar.miktarMl = Number(miktarMl);
        if (motiliteYuzde) detaylar.motiliteYuzde = Number(motiliteYuzde);
        if (payetSayisi) detaylar.payetSayisi = Number(payetSayisi);
      } else if (tur === 'Damızlık Muayenesi') {
        if (skrotumCevresiCm) detaylar.skrotumCevresiCm = Number(skrotumCevresiCm);
      }

      const yeniKayit = {
        id: uuidv4(),
        hayvanId: hayvan.id,
        tarih,
        tur,
        notlar,
        maliyet: maliyet ? Number(maliyet) : undefined,
        detaylar
      };

      await db.uremeKayitlari.add(yeniKayit);
      await db.syncQueue.add({ table: 'uremeKayitlari', action: 'INSERT', payload: yeniKayit, created_at: Date.now() });

      if (tur === 'Doğal Aşım' && selectedDişiId) {
        const disiKayit = {
          id: uuidv4(),
          hayvanId: selectedDişiId,
          tarih,
          tur: 'Tohumlama/Aşım' as UremeKaydiTur,
          notlar: `Doğal Aşım (Boğa: ${hayvan.kupeNo}) ${notlar ? '- ' + notlar : ''}`,
          detaylar: {
            spermaBogaBilgisi: hayvan.kupeNo,
            teknisyen: 'Doğal Aşım'
          }
        };
        await db.uremeKayitlari.add(disiKayit);
        await db.syncQueue.add({ table: 'uremeKayitlari', action: 'INSERT', payload: disiKayit, created_at: Date.now() });
      }

      // Otomatik Tosun -> Boğa terfisi
      if (hayvan.tur === 'Tosun' && (tur === 'Doğal Aşım' || tur === 'Sperma Alımı')) {
         await db.hayvanlar.update(hayvan.id, { tur: 'Boğa' });
         const guncelHayvan = await db.hayvanlar.get(hayvan.id);
         if (guncelHayvan) await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: guncelHayvan, created_at: Date.now() });
      }

      if (navigator.onLine) {
        const { processSyncQueue } = await import('../services/syncService');
        processSyncQueue();
      }

      onClose();
    } catch (error) {
      console.error('Kayıt eklenirken hata oluştu:', error);
      alert('İşlem kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-earth-100">
          <h2 className="text-xl font-black text-earth-900">Yeni Üreme İşlemi (Erkek)</h2>
          <button onClick={onClose} className="text-earth-400 hover:text-earth-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-earth-700 mb-1">İşlem Türü</label>
              <select
                required
                className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 font-medium"
                value={tur}
                onChange={(e) => setTur(e.target.value as UremeKaydiTur)}
              >
                <option value="Doğal Aşım">Doğal Aşım</option>
                <option value="Sperma Alımı">Sperma Alımı</option>
                <option value="Damızlık Muayenesi">Damızlık Muayenesi</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-earth-700 mb-1">Tarih</label>
              <input
                type="date"
                required
                className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
              />
            </div>

            {tur === 'Doğal Aşım' && (
              <>
                <div className="col-span-2 relative">
                  <label className="block text-sm font-bold text-earth-700 mb-1">Sürüden Dişi Seç (Arama Özellikli)</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500 font-medium"
                      placeholder="Küpe No veya tür ile ara..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                        setSelectedDişiId(''); // Arama değiştiğinde seçimi sıfırla
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />
                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsDropdownOpen(false)}
                        ></div>
                        <div className="absolute z-20 w-full mt-1 bg-white border border-earth-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {disiHayvanlar
                            .filter(d => d.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()) || d.tur.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map(d => (
                              <div
                                key={d.id}
                                className="p-3 hover:bg-earth-50 cursor-pointer text-earth-900 border-b border-earth-100 last:border-0"
                                onClick={() => {
                                  setSelectedDişiId(d.id);
                                  setSearchTerm(`${d.kupeNo} (${d.tur})`);
                                  setIsDropdownOpen(false);
                                  setElleGirisDisi('');
                                }}
                              >
                                {d.kupeNo} <span className="text-earth-500 text-sm ml-2">({d.tur})</span>
                              </div>
                            ))}
                          {disiHayvanlar.filter(d => d.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()) || d.tur.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                             <div className="p-3 text-earth-500 text-sm text-center">Sonuç bulunamadı.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-earth-700 mb-1">Eşleşilen Dişi (Elle Yaz)</label>
                  <input
                    type="text"
                    placeholder="Sürü dışından bir hayvan ise buraya yazın..."
                    className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                    value={elleGirisDisi}
                    onChange={(e) => {
                      setElleGirisDisi(e.target.value);
                      if (e.target.value) {
                        setSelectedDişiId('');
                        setSearchTerm('');
                      }
                    }}
                    required={!selectedDişiId} // Biri zorunlu
                  />
                </div>
              </>
            )}

            {tur === 'Sperma Alımı' && (
              <>
                <div>
                  <label className="block text-sm font-bold text-earth-700 mb-1">Miktar (ml)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                    value={miktarMl}
                    onChange={(e) => setMiktarMl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-700 mb-1">Motilite (%)</label>
                  <input
                    type="number"
                    className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                    value={motiliteYuzde}
                    onChange={(e) => setMotiliteYuzde(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-earth-700 mb-1">Üretilen Payet (Doz)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                    value={payetSayisi}
                    onChange={(e) => setPayetSayisi(e.target.value)}
                  />
                </div>
              </>
            )}

            {tur === 'Damızlık Muayenesi' && (
              <div className="col-span-2">
                <label className="block text-sm font-bold text-earth-700 mb-1">Skrotum Çevresi (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                  value={skrotumCevresiCm}
                  onChange={(e) => setSkrotumCevresiCm(e.target.value)}
                />
              </div>
            )}

            <div className="col-span-2">
               <label className="block text-sm font-bold text-earth-700 mb-1">Maliyet (₺) - Opsiyonel</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <DollarSign className="h-5 w-5 text-earth-400" />
                 </div>
                 <input
                   type="number"
                   className="w-full pl-10 p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                   placeholder="Örn: 500"
                   value={maliyet}
                   onChange={(e) => setMaliyet(e.target.value)}
                 />
               </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-earth-700 mb-1">Notlar</label>
              <textarea
                className="w-full p-3 bg-earth-50 border border-earth-200 rounded-xl focus:ring-2 focus:ring-nature-500"
                rows={2}
                value={notlar}
                onChange={(e) => setNotlar(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-earth-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold text-earth-600 hover:bg-earth-100 rounded-xl transition"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-nature-600 text-white font-bold rounded-xl hover:bg-nature-700 transition flex items-center space-x-2 disabled:opacity-50"
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

export default MaleReproductionModal;
