import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { CalendarDays, Heart, CalendarCheck, Droplets } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getUremeAyarForIrk } from '../utils/reproductionSettings';

type EventType = 'Kızgınlık Beklentisi' | 'Kuruya Çıkarma Önerisi' | 'Tahmini Doğum';

interface ScheduleItem {
  hayvanId: string;
  kupeNo: string;
  tur: string;
  tarih: string;
  olayTuru: EventType;
}

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const EVENT_CONFIG: Record<EventType, { icon: React.ReactNode; color: string; bg: string }> = {
  'Kızgınlık Beklentisi': { icon: <Heart className="w-4 h-4" />, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200' },
  'Tahmini Doğum': { icon: <Droplets className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200' },
  'Kuruya Çıkarma Önerisi': { icon: <CalendarCheck className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200' },
};

const ReproductionSchedule: React.FC = () => {
  const navigate = useNavigate();
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.orderBy('tarih').reverse().toArray()) || [];

  const [filtre, setFiltre] = useState<EventType | 'Tümü'>('Tümü');
  const { uremeAyarlari } = useStore();

  // Planları oluştur
  const planlar: ScheduleItem[] = [];

  for (const hayvan of hayvanlar) {
    if (hayvan.cinsiyet === 'Erkek') continue;
    
    const irkAyari = getUremeAyarForIrk(hayvan.irk, uremeAyarlari);

    // Hayvanın olaylarını tarihe göre azalan (en yeni en başta) sırala
    const olaylar = uremeKayitlari.filter(o => o.hayvanId === hayvan.id);
    if (olaylar.length === 0) continue;

    const sonOlay = olaylar[0];

    if (sonOlay.tur === 'Gebelik Kontrolü') {
      if (sonOlay.durum === 'Gebe') {
        const sonTohumlama = olaylar.find(o => o.tur === 'Tohumlama/Aşım');
        if (sonTohumlama) {
          const tahminiDogum = addDays(sonTohumlama.tarih, irkAyari.gebelikSuresi);
          const onerilenKuruyaCikarma = addDays(tahminiDogum, -irkAyari.kuruyaCikarma);

          planlar.push({ hayvanId: hayvan.id, kupeNo: hayvan.kupeNo, tur: hayvan.tur, tarih: tahminiDogum, olayTuru: 'Tahmini Doğum' });

          if (!olaylar.some(o => o.tur === 'Kuruya Çıkarma')) {
            planlar.push({ hayvanId: hayvan.id, kupeNo: hayvan.kupeNo, tur: hayvan.tur, tarih: onerilenKuruyaCikarma, olayTuru: 'Kuruya Çıkarma Önerisi' });
          }
        }
      } else if (sonOlay.durum === 'Boş' || sonOlay.durum === 'Belirsiz') {
        const beklenen = addDays(sonOlay.tarih, irkAyari.kizginlikDongusu);
        planlar.push({ hayvanId: hayvan.id, kupeNo: hayvan.kupeNo, tur: hayvan.tur, tarih: beklenen, olayTuru: 'Kızgınlık Beklentisi' });
      }
    } else if (sonOlay.tur === 'Kızgınlık') {
      const beklenen = addDays(sonOlay.tarih, irkAyari.kizginlikDongusu);
      planlar.push({ hayvanId: hayvan.id, kupeNo: hayvan.kupeNo, tur: hayvan.tur, tarih: beklenen, olayTuru: 'Kızgınlık Beklentisi' });
    } else if (sonOlay.tur === 'Kuruya Çıkarma') {
      const sonTohumlama = olaylar.find(o => o.tur === 'Tohumlama/Aşım');
      let tahminiDogum: string;
      if (sonTohumlama) {
        tahminiDogum = addDays(sonTohumlama.tarih, irkAyari.gebelikSuresi);
      } else {
        // Eğer tohumlama kaydı yoksa kuruya çıkarma tarihine 60 gün ekle (kuru dönemi)
        tahminiDogum = addDays(sonOlay.tarih, irkAyari.kuruyaCikarma);
      }
      planlar.push({ hayvanId: hayvan.id, kupeNo: hayvan.kupeNo, tur: hayvan.tur, tarih: tahminiDogum, olayTuru: 'Tahmini Doğum' });
    } else if (sonOlay.tur === 'Tohumlama/Aşım') {
      const beklenen = addDays(sonOlay.tarih, irkAyari.kizginlikDongusu);
      planlar.push({ hayvanId: hayvan.id, kupeNo: hayvan.kupeNo, tur: hayvan.tur, tarih: beklenen, olayTuru: 'Kızgınlık Beklentisi' });
    }
  }

  // Tarihe göre artan sırala
  planlar.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

  const filtrelenmis = planlar.filter(p => filtre === 'Tümü' || p.olayTuru === filtre);

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col h-full">

        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-pink-50 dark:bg-pink-900/20 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-6 h-6 text-pink-600" />
            <div>
              <h2 className="text-xl font-black text-earth-900 dark:text-gray-100">Üreme Takvimi</h2>
              <p className="text-xs text-earth-500 dark:text-gray-400">Yaklaşan doğumlar, kuruya çıkarma ve kızgınlık beklentileri</p>
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="flex items-center space-x-2 p-4 border-b border-earth-100 dark:border-gray-700 overflow-x-auto">
          {(['Tümü', 'Kızgınlık Beklentisi', 'Kuruya Çıkarma Önerisi', 'Tahmini Doğum'] as const).map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 text-sm font-bold rounded-lg whitespace-nowrap transition ${filtre === f ? 'bg-earth-800 text-white' : 'bg-earth-100 dark:bg-gray-800 text-earth-600 dark:text-gray-400 hover:bg-earth-200'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtrelenmis.length === 0 && (
            <div className="text-center py-12 text-earth-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Yaklaşan bir üreme olayı bulunmuyor.</p>
            </div>
          )}

          {filtrelenmis.map((plan, idx) => {
            const config = EVENT_CONFIG[plan.olayTuru];
            const isOverdue = new Date(plan.tarih) < new Date(new Date().setHours(0,0,0,0));
            return (
              <div 
                key={idx} 
                onClick={() => navigate(`/hayvanlar?id=${plan.hayvanId}&tab=ureme`)}
                className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer hover:shadow-md transition ${isOverdue ? 'bg-red-50 dark:bg-red-900/20 border-red-300 shadow-sm hover:bg-red-100' : `${config.bg} hover:brightness-95`}`}
              >
                <div className={`flex-shrink-0 ${isOverdue ? 'text-red-600' : config.color}`}>{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="font-bold text-earth-900 dark:text-gray-100 text-sm">{plan.kupeNo}</span>
                    <span className="text-xs text-earth-500 dark:text-gray-400 font-mono bg-white/70 px-2 py-0.5 rounded border border-earth-200 dark:border-gray-700">{plan.tur}</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-0.5">
                    <span className={`text-xs font-bold ${isOverdue ? 'text-red-700' : config.color}`}>{plan.olayTuru}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`text-sm font-bold ${isOverdue ? 'text-red-700' : 'text-earth-800 dark:text-gray-200'}`}>{new Date(plan.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {isOverdue && <span className="text-[10px] font-bold text-red-600 uppercase mt-1 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">Gecikti</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReproductionSchedule;
