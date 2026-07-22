import React, { useState, useEffect } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { Plus, TestTube, Activity, Heart, Info, CalendarDays } from 'lucide-react';
import MaleReproductionModal from './MaleReproductionModal';
import type { Hayvan } from '../types';

interface Props {
  hayvan: Hayvan;
}

const MaleReproductionTimeline: React.FC<Props> = ({ hayvan }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const uremeKayitlari = useLiveFarmQuery(() =>
    db.uremeKayitlari
      .where('hayvanId').equals(hayvan.id)
      .reverse()
      .sortBy('tarih')
  ) || [];

  useEffect(() => {
    if (hayvan.tur === 'Tosun' && uremeKayitlari.length > 0) {
      const hasBreedingRecord = uremeKayitlari.some(k => k.tur === 'Doğal Aşım' || k.tur === 'Sperma Alımı');
      if (hasBreedingRecord) {
        db.hayvanlar.update(hayvan.id, { tur: 'Boğa' }).then(() => {
          db.hayvanlar.get(hayvan.id).then(h => {
             if (h) db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: h, created_at: Date.now() });
          });
        });
      }
    }
  }, [hayvan.tur, hayvan.id, uremeKayitlari]);

  const asimSayisi = uremeKayitlari.filter(k => k.tur === 'Doğal Aşım').length;
  const spermaSayisi = uremeKayitlari.filter(k => k.tur === 'Sperma Alımı').length;

  const toplamUretilenDoz = uremeKayitlari
    .filter(k => k.tur === 'Sperma Alımı' && k.detaylar?.payetSayisi)
    .reduce((acc, curr) => acc + (Number(curr.detaylar?.payetSayisi) || 0), 0);

  const getIcon = (tur: string) => {
    switch (tur) {
      case 'Doğal Aşım': return <Heart className="w-5 h-5 text-red-500" />;
      case 'Sperma Alımı': return <TestTube className="w-5 h-5 text-blue-500" />;
      case 'Damızlık Muayenesi': return <Activity className="w-5 h-5 text-purple-500" />;
      default: return <Info className="w-5 h-5 text-earth-500 dark:text-gray-400" />;
    }
  };

  const getBgColor = (tur: string) => {
    switch (tur) {
      case 'Doğal Aşım': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50';
      case 'Sperma Alımı': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50';
      case 'Damızlık Muayenesi': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50';
      default: return 'bg-earth-50 dark:bg-gray-900 border-earth-200 dark:border-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Boğa İstatistikleri */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-earth-500 dark:text-gray-400 font-bold uppercase tracking-wider">Toplam Doğal Aşım</div>
            <div className="text-2xl font-black text-earth-900 dark:text-gray-100">{asimSayisi}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <TestTube className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-earth-500 dark:text-gray-400 font-bold uppercase tracking-wider">Sperma Alımı İşlemi</div>
            <div className="text-2xl font-black text-earth-900 dark:text-gray-100">{spermaSayisi}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-earth-500 dark:text-gray-400 font-bold uppercase tracking-wider">Toplam Üretilen Doz</div>
            <div className="text-2xl font-black text-earth-900 dark:text-gray-100">{toplamUretilenDoz} <span className="text-sm font-bold text-earth-500 dark:text-gray-400">payet</span></div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-earth-900 dark:text-gray-100">Üreme Geçmişi</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-nature-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-nature-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni İşlem Ekle</span>
        </button>
      </div>

      {uremeKayitlari.length === 0 ? (
        <div className="text-center py-12 text-earth-500 dark:text-gray-400 bg-earth-50 dark:bg-gray-900 rounded-xl border border-earth-200 dark:border-gray-700 border-dashed">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Henüz bir üreme kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="relative pl-4 md:pl-0">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-earth-200 hidden md:block"></div>
          <div className="space-y-4">
            {uremeKayitlari.map((kayit) => (
              <div key={kayit.id} className="relative flex flex-col md:flex-row md:items-start space-y-2 md:space-y-0 md:space-x-6">
                <div className="hidden md:flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm ${getBgColor(kayit.tur)}`}>
                    {getIcon(kayit.tur)}
                  </div>
                </div>

                <div className={`flex-1 bg-white dark:bg-gray-800 p-4 rounded-xl border shadow-sm ${getBgColor(kayit.tur)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-earth-900 dark:text-gray-100 text-lg flex items-center space-x-2">
                        <span className="md:hidden">{getIcon(kayit.tur)}</span>
                        <span>{kayit.tur}</span>
                      </h4>
                      <p className="text-sm text-earth-500 dark:text-gray-400">{new Date(kayit.tarih).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>

                  {kayit.notlar && (
                    <p className="text-sm text-earth-700 dark:text-gray-300 mt-2 bg-white/50 p-2 rounded-lg">{kayit.notlar}</p>
                  )}

                  {kayit.detaylar && Object.keys(kayit.detaylar).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-black/5 grid grid-cols-2 gap-2 text-sm">
                      {kayit.detaylar.eslesilenInek && (
                        <div className="col-span-2">
                          <span className="text-earth-500 dark:text-gray-400">Eşleşilen Dişi: </span>
                          <span className="font-bold text-earth-900 dark:text-gray-100">{kayit.detaylar.eslesilenInek}</span>
                        </div>
                      )}
                      {kayit.detaylar.miktarMl && (
                        <div>
                          <span className="text-earth-500 dark:text-gray-400">Miktar: </span>
                          <span className="font-bold text-earth-900 dark:text-gray-100">{kayit.detaylar.miktarMl} ml</span>
                        </div>
                      )}
                      {kayit.detaylar.motiliteYuzde && (
                        <div>
                          <span className="text-earth-500 dark:text-gray-400">Motilite: </span>
                          <span className="font-bold text-earth-900 dark:text-gray-100">% {kayit.detaylar.motiliteYuzde}</span>
                        </div>
                      )}
                      {kayit.detaylar.payetSayisi && (
                        <div>
                          <span className="text-earth-500 dark:text-gray-400">Üretilen Payet: </span>
                          <span className="font-bold text-earth-900 dark:text-gray-100">{kayit.detaylar.payetSayisi} doz</span>
                        </div>
                      )}
                      {kayit.detaylar.skrotumCevresiCm && (
                        <div>
                          <span className="text-earth-500 dark:text-gray-400">Skrotum Çevresi: </span>
                          <span className="font-bold text-earth-900 dark:text-gray-100">{kayit.detaylar.skrotumCevresiCm} cm</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <MaleReproductionModal
          hayvan={hayvan}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default MaleReproductionTimeline;
