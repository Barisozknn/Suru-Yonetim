import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { SaglikOlayi, SaglikOlayiTur } from '../types';
import { Syringe, Stethoscope, Pill, Scissors, FileText, Plus, Trash2, AlertTriangle } from 'lucide-react';
import HealthEventModal from './HealthEventModal';

const TUR_CONFIG: Record<SaglikOlayiTur, { icon: React.ReactNode; color: string; bg: string }> = {
  'Muayene': { icon: <Stethoscope className="w-4 h-4" />, color: 'text-nature-600 dark:text-nature-400', bg: 'bg-nature-50 dark:bg-nature-900/30 border-nature-200 dark:border-nature-800' },
  'Aşı':    { icon: <Syringe className="w-4 h-4" />,     color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' },
  'İlaç':   { icon: <Pill className="w-4 h-4" />,         color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' },
  'Operasyon': { icon: <Scissors className="w-4 h-4" />, color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20 border-red-200' },
  'Diğer':  { icon: <FileText className="w-4 h-4" />,    color: 'text-earth-600 dark:text-gray-400',  bg: 'bg-earth-50 dark:bg-gray-900 border-earth-200 dark:border-gray-700' },
};

// Arınma bitiş tarihini hesapla
const arinmaBitisStr = (olay: SaglikOlayi): string | null => {
  if (!olay.arinmaSuresiGun || olay.arinmaSuresiGun <= 0) return null;
  const d = new Date(olay.tarih);
  d.setDate(d.getDate() + olay.arinmaSuresiGun);
  return d.toISOString().split('T')[0];
};

const kalanArinmaGun = (olay: SaglikOlayi): number => {
  const bitis = arinmaBitisStr(olay);
  if (!bitis) return 0;
  const today = new Date(); today.setHours(0,0,0,0);
  const bitisDate = new Date(bitis); bitisDate.setHours(0,0,0,0);
  return Math.max(0, Math.ceil((bitisDate.getTime() - today.getTime()) / 86400000));
};

interface Props {
  hayvanId: string;
}

const HealthTimeline: React.FC<Props> = ({ hayvanId }) => {
  const olaylar = useLiveFarmQuery(
    () => db.saglikOlaylari.where('hayvanId').equals(hayvanId).reverse().sortBy('tarih'),
    [hayvanId]
  ) || [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SaglikOlayi | undefined>(undefined);

  const handleSil = async (id: string) => {
    if (!confirm('Bu sağlık kaydını silmek istediğinizden emin misiniz?')) return;
    await db.saglikOlaylari.delete(id);
    await db.syncQueue.add({ table: 'saglikOlaylari', action: 'DELETE', payload: { id }, created_at: Date.now() });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-earth-800 dark:text-gray-200 text-lg">Sağlık Geçmişi</h3>
        <button
          onClick={() => { setEditTarget(undefined); setModalOpen(true); }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-nature-600 text-white rounded-lg font-bold text-sm hover:bg-nature-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Sağlık Olayı Ekle</span>
        </button>
      </div>

      {olaylar.length === 0 && (
        <div className="text-center py-10 text-earth-400">
          <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>Henüz sağlık kaydı yok.</p>
        </div>
      )}

      <div className="relative">
        {/* Zaman çizelgesi çizgisi */}
        {olaylar.length > 0 && (
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-earth-200" />
        )}

        <div className="space-y-4">
          {olaylar.map((olay) => {
            const config = TUR_CONFIG[olay.tur];
            const kalan = kalanArinmaGun(olay);
            return (
              <div key={olay.id} className="flex items-start space-x-4">
                {/* İkon noktası */}
                <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color} border-current`}>
                  {config.icon}
                </div>
                {/* Kart */}
                <div className={`flex-1 border rounded-xl p-3 ${config.bg} group`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-sm ${config.color}`}>{olay.tur}</span>
                        {olay.ilacAdi && (
                          <span className="text-xs font-mono bg-white/70 px-2 py-0.5 rounded border border-current/20">{olay.ilacAdi}</span>
                        )}
                        {kalan > 0 && (
                          <span className="flex items-center space-x-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Arınmada — {kalan} gün</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-earth-500 dark:text-gray-400 mt-0.5">{new Date(olay.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => { setEditTarget(olay); setModalOpen(true); }} className="p-1 text-earth-400 hover:text-earth-700 transition text-xs">✏️</button>
                      <button onClick={() => handleSil(olay.id)} className="p-1 text-earth-400 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-1.5 gap-2">
                    <p className="text-sm text-earth-700 dark:text-gray-300 flex-1">{olay.aciklama}</p>
                    {olay.maliyet !== undefined && olay.maliyet !== null && olay.maliyet > 0 && (
                      <span className="text-xs font-bold text-earth-600 dark:text-gray-400 bg-earth-100 dark:bg-gray-800 px-2 py-0.5 rounded border border-earth-200 dark:border-gray-700 whitespace-nowrap flex-shrink-0">
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
        <HealthEventModal
          hayvanId={hayvanId}
          existing={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
        />
      )}
    </div>
  );
};

export default HealthTimeline;
