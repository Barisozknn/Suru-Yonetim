import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { 
  ChevronLeft, ChevronRight, Droplet, Scale, Syringe, 
  Heart, Wheat, AlertTriangle, Info, Calendar as CalendarIcon, CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

interface CalendarEvent {
  id: string;
  type: 'Süt' | 'Tartım' | 'Sağlık' | 'Aşı' | 'Üreme' | 'Yem' | 'Doğum' | 'Sütten Kesim' | 'Tahmini Doğum' | 'Kızgınlık Beklentisi' | 'Kuruya Çıkarma Önerisi';
  title: string;
  details?: string;
  dateStr: string; // YYYY-MM-DD
  icon: React.ReactNode;
  color: string;
  link?: string;
}

const EMPTY_ARRAY: any[] = [];

export const SmartCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { uremeAyarlari } = useStore();

  // Dexie Queries
  const sutKayitlari = useLiveQuery(() => db.sutKayitlari.toArray()) || EMPTY_ARRAY;
  const agirlikKayitlari = useLiveQuery(() => db.agirlikKayitlari.toArray()) || EMPTY_ARRAY;
  const saglikOlaylari = useLiveQuery(() => db.saglikOlaylari.toArray()) || EMPTY_ARRAY;
  const asilar = useLiveQuery(() => db.planlananAsilar.toArray()) || EMPTY_ARRAY;
  const uremeKayitlari = useLiveQuery(() => db.uremeKayitlari.toArray()) || EMPTY_ARRAY;
  const yemHareketleri = useLiveQuery(() => db.yemHareketleri.toArray()) || EMPTY_ARRAY;
  const hayvanlar = useLiveQuery(() => db.hayvanlar.toArray()) || EMPTY_ARRAY;
  const buzagiKayitlari = useLiveQuery(() => db.buzagiKayitlari.toArray()) || EMPTY_ARRAY;
  const yemler = useLiveQuery(() => db.yemler.toArray()) || EMPTY_ARRAY;

  const getHayvanNo = (id: string) => hayvanlar.find(h => h.id === id)?.kupeNo || 'Bilinmeyen Hayvan';
  const getYemAd = (id: string) => yemler.find(y => y.id === id)?.ad || 'Bilinmeyen Yem';

  // Aggregate all events
  const allEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Süt
    sutKayitlari.forEach(k => {
      events.push({
        id: `sut-${k.id}`,
        type: 'Süt',
        title: `${getHayvanNo(k.hayvanId)}: ${k.litre}L Süt`,
        dateStr: k.tarih.split('T')[0],
        icon: <Droplet className="w-4 h-4" />,
        color: 'text-blue-600 bg-blue-100 border-blue-200',
        link: `/hayvanlar?id=${k.hayvanId}&tab=verim`
      });
    });

    // Tartım
    agirlikKayitlari.forEach(k => {
      events.push({
        id: `agirlik-${k.id}`,
        type: 'Tartım',
        title: `${getHayvanNo(k.hayvanId)}: ${k.kg}kg Tartım`,
        dateStr: k.tarih.split('T')[0],
        icon: <Scale className="w-4 h-4" />,
        color: 'text-nature-600 bg-nature-100 border-nature-200',
        link: `/hayvanlar?id=${k.hayvanId}&tab=verim`
      });
    });

    // Sağlık Olayları
    saglikOlaylari.forEach(k => {
      events.push({
        id: `saglik-${k.id}`,
        type: 'Sağlık',
        title: `${getHayvanNo(k.hayvanId)}: ${k.tur}`,
        details: k.aciklama,
        dateStr: k.tarih.split('T')[0],
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-red-600 bg-red-100 border-red-200',
        link: `/hayvanlar?id=${k.hayvanId}&tab=saglik`
      });
    });

    // Aşılar
    asilar.forEach(k => {
      const asiHayvan = hayvanlar.find(h => h.id === k.hayvanId);
      if(!asiHayvan) return;
      events.push({
        id: `asi-${k.id}`,
        type: 'Aşı',
        title: `${asiHayvan.kupeNo}: Aşısı`,
        details: k.yapildiMi ? 'Yapıldı' : 'Planlandı',
        dateStr: k.planlanaTarih.split('T')[0],
        icon: <Syringe className="w-4 h-4" />,
        color: k.yapildiMi ? 'text-green-600 bg-green-100 border-green-200' : 'text-orange-600 bg-orange-100 border-orange-200'
      });
    });

    // Üreme
    uremeKayitlari.forEach(k => {
      events.push({
        id: `ureme-${k.id}`,
        type: 'Üreme',
        title: `${getHayvanNo(k.hayvanId)}: ${k.tur}`,
        details: k.durum ? `Durum: ${k.durum}` : undefined,
        dateStr: k.tarih.split('T')[0],
        icon: <Heart className="w-4 h-4" />,
        color: 'text-pink-600 bg-pink-100 border-pink-200',
        link: `/hayvanlar?id=${k.hayvanId}&tab=ureme`
      });
    });

    const addDays = (dateStr: string, days: number) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // Hesaplanan Üreme Olayları
    for (const hayvan of hayvanlar) {
      if (hayvan.cinsiyet === 'Erkek') continue;

      const olar = uremeKayitlari.filter(o => o.hayvanId === hayvan.id);
      if (olar.length === 0) continue;

      // Copy and sort the animal's events
      const hayvanOlaylari = [...olar].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      const sonOlay = hayvanOlaylari[0];

      if (sonOlay.tur === 'Gebelik Kontrolü') {
        if (sonOlay.durum === 'Gebe') {
          const sonTohumlama = hayvanOlaylari.find(o => o.tur === 'Tohumlama/Aşım');
          if (sonTohumlama) {
            const tahminiDogum = addDays(sonTohumlama.tarih, uremeAyarlari.gebelikSuresi);
            const onerilenKuruyaCikarma = addDays(tahminiDogum, -uremeAyarlari.kuruyaCikarma);

            events.push({
              id: `tahmini-dogum-${hayvan.id}`,
              type: 'Tahmini Doğum',
              title: `${hayvan.kupeNo}: Tahmini Doğum`,
              dateStr: tahminiDogum,
              icon: <Droplet className="w-4 h-4" />,
              color: 'text-green-600 bg-green-100 border-green-200',
              link: `/hayvanlar?id=${hayvan.id}&tab=ureme`
            });

            if (!hayvanOlaylari.some(o => o.tur === 'Kuruya Çıkarma')) {
              events.push({
                id: `kuruya-cikarma-${hayvan.id}`,
                type: 'Kuruya Çıkarma Önerisi',
                title: `${hayvan.kupeNo}: Kuruya Çıkarma`,
                dateStr: onerilenKuruyaCikarma,
                icon: <CalendarCheck className="w-4 h-4" />,
                color: 'text-orange-600 bg-orange-100 border-orange-200',
                link: `/hayvanlar?id=${hayvan.id}&tab=ureme`
              });
            }
          }
        } else if (sonOlay.durum === 'Boş' || sonOlay.durum === 'Belirsiz') {
          const beklenen = addDays(sonOlay.tarih, uremeAyarlari.kizginlikDongusu);
          events.push({
            id: `kizginlik-beklentisi-${hayvan.id}`,
            type: 'Kızgınlık Beklentisi',
            title: `${hayvan.kupeNo}: Kızgınlık Beklentisi`,
            dateStr: beklenen,
            icon: <Heart className="w-4 h-4" />,
            color: 'text-pink-600 bg-pink-100 border-pink-200',
            link: `/hayvanlar?id=${hayvan.id}&tab=ureme`
          });
        }
      } else if (sonOlay.tur === 'Kızgınlık') {
        const beklenen = addDays(sonOlay.tarih, uremeAyarlari.kizginlikDongusu);
        events.push({
          id: `kizginlik-beklentisi-${hayvan.id}`,
          type: 'Kızgınlık Beklentisi',
          title: `${hayvan.kupeNo}: Kızgınlık Beklentisi`,
          dateStr: beklenen,
          icon: <Heart className="w-4 h-4" />,
          color: 'text-pink-600 bg-pink-100 border-pink-200',
          link: `/hayvanlar?id=${hayvan.id}&tab=ureme`
        });
      } else if (sonOlay.tur === 'Kuruya Çıkarma') {
        const sonTohumlama = hayvanOlaylari.find(o => o.tur === 'Tohumlama/Aşım');
        let tahminiDogum: string;
        if (sonTohumlama) {
          tahminiDogum = addDays(sonTohumlama.tarih, uremeAyarlari.gebelikSuresi);
        } else {
          tahminiDogum = addDays(sonOlay.tarih, uremeAyarlari.kuruyaCikarma);
        }
        events.push({
          id: `tahmini-dogum-${hayvan.id}`,
          type: 'Tahmini Doğum',
          title: `${hayvan.kupeNo}: Tahmini Doğum`,
          dateStr: tahminiDogum,
          icon: <Droplet className="w-4 h-4" />,
          color: 'text-green-600 bg-green-100 border-green-200',
          link: `/hayvanlar?id=${hayvan.id}&tab=ureme`
        });
      } else if (sonOlay.tur === 'Tohumlama/Aşım') {
        const beklenen = addDays(sonOlay.tarih, uremeAyarlari.kizginlikDongusu);
        events.push({
          id: `kizginlik-beklentisi-${hayvan.id}`,
          type: 'Kızgınlık Beklentisi',
          title: `${hayvan.kupeNo}: Kızgınlık Beklentisi`,
          dateStr: beklenen,
          icon: <Heart className="w-4 h-4" />,
          color: 'text-pink-600 bg-pink-100 border-pink-200',
          link: `/hayvanlar?id=${hayvan.id}&tab=ureme`
        });
      }
    }

    // Yem
    yemHareketleri.forEach(k => {
      events.push({
        id: `yem-${k.id}`,
        type: 'Yem',
        title: `${getYemAd(k.yemId)} ${k.islemTuru}`,
        details: `${k.miktarKg} kg`,
        dateStr: k.islemTarihi.split('T')[0],
        icon: <Wheat className="w-4 h-4" />,
        color: 'text-amber-600 bg-amber-100 border-amber-200',
        link: `/yem`
      });
    });

    // Doğumlar (hayvanlar)
    hayvanlar.forEach(k => {
      if (k.dogumTarihi) {
        events.push({
          id: `dogum-${k.id}`,
          type: 'Doğum',
          title: `${k.kupeNo} Doğdu`,
          dateStr: k.dogumTarihi.split('T')[0],
          icon: <Droplet className="w-4 h-4" />,
          color: 'text-purple-600 bg-purple-100 border-purple-200',
          link: `/hayvanlar?id=${k.id}&tab=ozet`
        });
      }
    });

    // Sütten Kesim (Buzağı)
    hayvanlar.filter(h => h.tur === 'Buzağı').forEach(hayvan => {
      const kayit = buzagiKayitlari.find(k => k.hayvanId === hayvan.id);

      if (kayit?.gerceklesenSuttenKesimTarihi) {
        events.push({
          id: `kesimgercek-${hayvan.id}`,
          type: 'Sütten Kesim',
          title: `${hayvan.kupeNo}: Sütten Kesim (Gerçekleşti)`,
          dateStr: kayit.gerceklesenSuttenKesimTarihi.split('T')[0],
          icon: <Droplet className="w-4 h-4" />,
          color: 'text-teal-600 bg-teal-100 border-teal-200',
          link: `/hayvanlar?id=${hayvan.id}&tab=ozet`
        });
      } else if (kayit?.hedefSuttenKesimTarihi) {
        events.push({
          id: `kesimhedef-${hayvan.id}`,
          type: 'Sütten Kesim',
          title: `${hayvan.kupeNo}: Sütten Kesim (Hedef)`,
          dateStr: kayit.hedefSuttenKesimTarihi.split('T')[0],
          icon: <Droplet className="w-4 h-4" />,
          color: 'text-teal-600 bg-teal-100 border-teal-200',
          link: `/hayvanlar?id=${hayvan.id}&tab=ozet`
        });
      }
    });

    return events;
  }, [sutKayitlari, agirlikKayitlari, saglikOlaylari, asilar, uremeKayitlari, yemHareketleri, hayvanlar, buzagiKayitlari, yemler, uremeAyarlari]);

  // Calendar Helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  // Ayarlamalar: Pazartesi haftanın ilk günü olsun
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 
  
  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getEventsForDate = (dateStr: string) => {
    return allEvents.filter(e => e.dateStr === dateStr);
  };

  const renderCells = () => {
    const cells = [];
    
    // JS'de new Date() yaparken timezone offset karışıklığını gidermek için
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const todayStr = today.toISOString().split('T')[0];
    
    const selDate = new Date(selectedDate);
    selDate.setMinutes(selDate.getMinutes() - selDate.getTimezoneOffset());
    const selectedStr = selDate.toISOString().split('T')[0];

    // Boş hücreler
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2 border-b border-r border-earth-100 bg-earth-50/50 min-h-[80px]"></div>);
    }

    // Günler
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      // Yerel saat farkından dolayı iso string alırken timezone'u düzeltelim
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = getEventsForDate(dateStr);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;

      cells.push(
        <div 
          key={i} 
          onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))}
          className={`p-2 border-b border-r border-earth-100 min-h-[80px] cursor-pointer transition relative group
            ${isSelected ? 'bg-nature-50' : 'hover:bg-earth-50'}
          `}
        >
          <div className="flex justify-between items-start">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
              ${isToday ? 'bg-nature-600 text-white shadow-sm' : 
                isSelected ? 'text-nature-700 font-bold' : 'text-earth-700'}
            `}>
              {i}
            </span>
            {dayEvents.length > 0 && (
              <span className="text-[10px] font-bold bg-earth-200 text-earth-700 px-1.5 py-0.5 rounded-md">
                {dayEvents.length}
              </span>
            )}
          </div>
          
          {/* Olay İkonları - Özet */}
          <div className="mt-2 flex flex-wrap gap-1">
            {dayEvents.slice(0, 4).map((e, idx) => (
              <div key={idx} className={`w-4 h-4 rounded-full flex items-center justify-center ${e.color}`} title={e.title}>
                {React.cloneElement(e.icon as React.ReactElement<any>, { className: 'w-2.5 h-2.5' })}
              </div>
            ))}
            {dayEvents.length > 4 && (
              <div className="w-4 h-4 rounded-full bg-earth-200 text-earth-600 text-[8px] flex items-center justify-center font-bold">
                +{dayEvents.length - 4}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Grid tamamlamak için boş hücreler (hafta 7 güne tamamlanmalı)
    const totalCells = startOffset + daysInMonth;
    const remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        cells.push(<div key={`empty-end-${i}`} className="p-2 border-b border-r border-earth-100 bg-earth-50/50 min-h-[80px]"></div>);
      }
    }

    return cells;
  };

  // Seçili günün formatı
  const selDateStrObj = new Date(selectedDate);
  selDateStrObj.setMinutes(selDateStrObj.getMinutes() - selDateStrObj.getTimezoneOffset());
  const selectedDateStr = selDateStrObj.toISOString().split('T')[0];
  const selectedDayEvents = getEventsForDate(selectedDateStr);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-earth-200 overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
      
      {/* Sol Taraf - Takvim Izgarası */}
      <div className="flex-1 border-r border-earth-200">
        <div className="p-4 border-b border-earth-200 bg-earth-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-nature-100 text-nature-600 rounded-lg">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-earth-900 tracking-tight">Akıllı Takvim</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button onClick={goToToday} className="px-3 py-1.5 text-xs font-bold text-nature-700 bg-nature-100 hover:bg-nature-200 rounded-md transition">
              Bugün
            </button>
            <div className="flex bg-white border border-earth-200 rounded-lg overflow-hidden shadow-sm">
              <button onClick={prevMonth} className="p-2 hover:bg-earth-50 text-earth-600 transition"><ChevronLeft className="w-5 h-5" /></button>
              <div className="px-4 py-2 font-bold text-earth-800 min-w-[140px] text-center border-l border-r border-earth-200">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </div>
              <button onClick={nextMonth} className="p-2 hover:bg-earth-50 text-earth-600 transition"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
        
        <div>
          {/* Gün İsimleri */}
          <div className="grid grid-cols-7 bg-earth-100/50 border-b border-earth-200">
            {dayNames.map(day => (
              <div key={day} className="py-2 text-center text-xs font-bold text-earth-500 uppercase tracking-wider border-r border-earth-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Takvim Izgarası */}
          <div className="grid grid-cols-7 border-l border-t border-earth-100">
            {renderCells()}
          </div>
        </div>
      </div>

      {/* Sağ Taraf - Olaylar Listesi */}
      <div className="w-full lg:w-96 bg-earth-50 flex flex-col max-h-[600px] lg:max-h-[auto]">
        <div className="p-5 border-b border-earth-200 bg-white">
          <h3 className="font-bold text-earth-800 text-lg">
            {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
          </h3>
          <p className="text-sm text-earth-500 mt-1">{selectedDayEvents.length} kayıtlı işlem</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map(event => (
              <div 
                key={event.id} 
                onClick={() => { if (event.link) navigate(event.link); }}
                className={`p-4 rounded-xl border bg-white shadow-sm flex items-start space-x-3 ${event.color.split(' ')[2]} ${event.link ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${event.color}`}>
                  {event.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black uppercase tracking-wider ${event.color.split(' ')[0]}`}>
                      {event.type}
                    </span>
                  </div>
                  <p className="font-bold text-earth-900 text-sm">{event.title}</p>
                  {event.details && (
                    <p className="text-sm text-earth-600 mt-1">{event.details}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full py-12 text-earth-400">
              <Info className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Bu tarihe ait kayıt bulunamadı.</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
