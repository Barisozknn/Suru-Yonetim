import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { UremeKaydi, UremeKaydiTur } from '../types';
import { useStore } from '../store/useStore';
import { Plus, Trash2, Heart, Info, CalendarCheck, ShieldAlert, CalendarDays, GitMerge, Droplet, Activity, Droplets } from 'lucide-react';
import ReproductionModal from './ReproductionModal';

interface Props {
  hayvanId: string;
}

const TUR_CONFIG: Record<UremeKaydiTur, { icon: React.ReactNode; color: string; bg: string }> = {
  'Kızgınlık': { icon: <Heart className="w-4 h-4" />, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
  'Tohumlama/Aşım': { icon: <Info className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  'Gebelik Kontrolü': { icon: <ShieldAlert className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  'Kuruya Çıkarma': { icon: <CalendarCheck className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  'Doğum': { icon: <Droplets className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  'Doğal Aşım': { icon: <GitMerge className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  'Sperma Alımı': { icon: <Droplet className="w-4 h-4" />, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
  'Damızlık Muayenesi': { icon: <Activity className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const ReproductionTimeline: React.FC<Props> = ({ hayvanId }) => {
  const olaylar = useLiveQuery(
    () => db.uremeKayitlari.where('hayvanId').equals(hayvanId).reverse().sortBy('tarih'),
    [hayvanId]
  ) || [];

  const { uremeAyarlari } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UremeKaydi | undefined>(undefined);

  const handleSil = async (id: string) => {
    if (!confirm('Bu üreme kaydını silmek istediğinizden emin misiniz?')) return;
    await db.uremeKayitlari.delete(id);
    await db.syncQueue.add({ table: 'uremeKayitlari', action: 'DELETE', payload: { id }, created_at: Date.now() });
  };

  // Beklenen tarihleri hesapla (son olaylara bakarak)
  let beklenenKizginlik: string | null = null;
  let tahminiDogum: string | null = null;
  let onerilenKuruyaCikarma: string | null = null;
  let mevcutDurum: string = 'Bilinmiyor';

  if (olaylar.length > 0) {
    const sonOlay = olaylar[0]; // En yeni olay
    if (sonOlay.tur === 'Gebelik Kontrolü') {
      if (sonOlay.durum === 'Gebe') {
        mevcutDurum = 'Gebe';
        // Son tohumlama tarihini bul
        const sonTohumlama = olaylar.find(o => o.tur === 'Tohumlama/Aşım');
        if (sonTohumlama) {
          tahminiDogum = addDays(sonTohumlama.tarih, uremeAyarlari.gebelikSuresi);
          onerilenKuruyaCikarma = addDays(tahminiDogum, -uremeAyarlari.kuruyaCikarma);
        }
      } else {
        mevcutDurum = sonOlay.durum === 'Boş' ? 'Boş' : 'Belirsiz';
        beklenenKizginlik = addDays(sonOlay.tarih, uremeAyarlari.kizginlikDongusu); // Boş ise tekrar kızgınlık beklenir
      }
    } else if (sonOlay.tur === 'Tohumlama/Aşım') {
      mevcutDurum = 'Tohumlandı (Gebelik Kontrolü Bekleniyor)';
    } else if (sonOlay.tur === 'Kızgınlık') {
      mevcutDurum = 'Kızgınlık Gözlemlendi (Tohumlanmadı)';
      beklenenKizginlik = addDays(sonOlay.tarih, uremeAyarlari.kizginlikDongusu);
    } else if (sonOlay.tur === 'Kuruya Çıkarma') {
      mevcutDurum = 'Kuruya Çıkarıldı (Doğum Bekleniyor)';
      const sonTohumlama = olaylar.find(o => o.tur === 'Tohumlama/Aşım');
      if (sonTohumlama) {
        tahminiDogum = addDays(sonTohumlama.tarih, uremeAyarlari.gebelikSuresi);
      } else {
        tahminiDogum = addDays(sonOlay.tarih, uremeAyarlari.kuruyaCikarma);
      }
    } else if (sonOlay.tur === 'Doğum') {
      mevcutDurum = 'Yeni Doğum Yaptı (Açık)';
    }
  }

  return (
    <div className="space-y-6">
      {/* Özet Kartı */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
        <h4 className="text-pink-800 font-bold mb-3 flex items-center space-x-2">
          <CalendarDays className="w-5 h-5" />
          <span>Üreme Durumu Özeti</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded-lg border border-pink-100">
            <div className="text-xs text-earth-500 font-bold uppercase tracking-wider mb-1">Mevcut Durum</div>
            <div className="font-bold text-earth-900 text-lg">{mevcutDurum}</div>
          </div>
          {(beklenenKizginlik || tahminiDogum || onerilenKuruyaCikarma) && (
            <div className="bg-white p-3 rounded-lg border border-pink-100 space-y-2">
              <div className="text-xs text-earth-500 font-bold uppercase tracking-wider mb-1">Yaklaşan Olaylar</div>
              {beklenenKizginlik && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-earth-600">Beklenen Kızgınlık:</span>
                  <span className="font-bold text-pink-600">{formatDate(beklenenKizginlik)}</span>
                </div>
              )}
              {onerilenKuruyaCikarma && !olaylar.some(o => o.tur === 'Kuruya Çıkarma') && (
                 <div className="flex justify-between items-center text-sm">
                 <span className="text-earth-600">Önerilen Kuruya Çıkarma:</span>
                 <span className="font-bold text-orange-600">{formatDate(onerilenKuruyaCikarma)}</span>
               </div>
              )}
              {tahminiDogum && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-earth-600">Tahmini Doğum:</span>
                  <span className="font-bold text-green-600">{formatDate(tahminiDogum)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-bold text-earth-800 text-lg">Üreme Geçmişi</h3>
        <button
          onClick={() => { setEditTarget(undefined); setModalOpen(true); }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-pink-600 text-white rounded-lg font-bold text-sm hover:bg-pink-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Üreme Olayı Ekle</span>
        </button>
      </div>

      {olaylar.length === 0 && (
        <div className="text-center py-10 text-earth-400">
          <Heart className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Henüz üreme kaydı yok.</p>
        </div>
      )}

      <div className="relative">
        {olaylar.length > 0 && (
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-earth-200" />
        )}

        <div className="space-y-4">
          {olaylar.map((olay) => {
            const normalizedTur = (olay.tur as string) === 'Tohumlama' ? 'Tohumlama/Aşım' : olay.tur;
            const config = TUR_CONFIG[normalizedTur as UremeKaydiTur] || TUR_CONFIG['Kızgınlık'];
            return (
              <div key={olay.id} className="flex items-start space-x-4">
                <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color} border-current`}>
                  {config.icon}
                </div>
                <div className={`flex-1 border rounded-xl p-3 ${config.bg} group`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${config.color}`}>{normalizedTur}</span>
                        {olay.durum && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${olay.durum === 'Gebe' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}>
                            {olay.durum}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-earth-500 mt-0.5">{formatDate(olay.tarih)}</p>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => { setEditTarget(olay); setModalOpen(true); }} className="p-1 text-earth-400 hover:text-earth-700 transition text-xs">✏️</button>
                      <button onClick={() => handleSil(olay.id)} className="p-1 text-earth-400 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Detaylar */}
                  {olay.detaylar && Object.keys(olay.detaylar).length > 0 && (
                     <div className="mt-2 grid grid-cols-2 gap-2">
                        {olay.detaylar.gozlemYontemi && <div className="text-xs"><span className="text-earth-500">Yöntem:</span> <span className="font-semibold">{olay.detaylar.gozlemYontemi}</span></div>}
                        {olay.detaylar.spermaBogaBilgisi && <div className="text-xs"><span className="text-earth-500">Sperma/Boğa:</span> <span className="font-semibold">{olay.detaylar.spermaBogaBilgisi}</span></div>}
                        {olay.detaylar.teknisyen && <div className="text-xs"><span className="text-earth-500">Teknisyen:</span> <span className="font-semibold">{olay.detaylar.teknisyen}</span></div>}
                     </div>
                  )}

                  <div className="flex justify-between items-end mt-1.5 gap-2">
                    <div className="text-sm text-earth-700 flex-1">
                      {olay.notlar && <p>{olay.notlar}</p>}
                    </div>
                    {olay.maliyet !== undefined && olay.maliyet !== null && olay.maliyet > 0 && (
                      <span className="text-xs font-bold text-earth-600 bg-earth-100 px-2 py-0.5 rounded border border-earth-200 whitespace-nowrap flex-shrink-0">
                        ₺{olay.maliyet}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <ReproductionModal
          hayvanId={hayvanId}
          existing={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
        />
      )}
    </div>
  );
};

export default ReproductionTimeline;
