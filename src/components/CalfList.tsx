import React, { useState, useMemo } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { calculateGrowthStatus, calculateAgeInDays, calculateADG, getADGStatus } from '../utils/calfCalculations';
import { X, Droplet, AlertCircle, Activity, ClipboardEdit, TrendingUp, Clock, Filter, ChevronRight } from 'lucide-react';
import { PiCow } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import CalfFormModal from './CalfFormModal';
import CalfMilkModal from './CalfMilkModal';
import BulkMilkModal from './BulkMilkModal';

interface Props {
  onClose?: () => void;
  onSelectCalf?: (id: string) => void;
}

type FilterType = 'tumu' | 'yakin' | 'eksik';

// Sütten kesime kaç gün kaldığını hesaplar
const getWeaningCountdown = (hedefTarih?: string): number | null => {
  if (!hedefTarih) return null;
  const target = new Date(hedefTarih);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const CalfList: React.FC<Props> = ({ onClose, onSelectCalf }) => {
  const navigate = useNavigate();
  const [selectedCalfForTracking, setSelectedCalfForTracking] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('tumu');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [selectedCalfForMilk, setSelectedCalfForMilk] = useState<string | null>(null);
  const [showBulkMilkModal, setShowBulkMilkModal] = useState(false);

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const buzagiKayitlari = useLiveFarmQuery(() => db.buzagiKayitlari.toArray()) || [];
  const tumAgirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray()) || [];

  // Sadece Buzağıları veya 6 aydan (180 gün) küçük olanları filtrele
  const buzagilar = useMemo(() =>
    hayvanlar
      .filter(h => h.tur === 'Buzağı' || calculateAgeInDays(h.dogumTarihi) <= 180)
      .map(h => {
        const kayit = buzagiKayitlari.find(k => k.hayvanId === h.id);
        const ageDays = calculateAgeInDays(h.dogumTarihi);
        const weaningCountdown = getWeaningCountdown(kayit?.hedefSuttenKesimTarihi);
        const growthInfo = calculateGrowthStatus(h.guncelAgirlikKg, kayit?.hedefSuttenKesimAgirligiKg);
        // GAA hesapla
        const hayvanAgirlikKayitlari = tumAgirlikKayitlari.filter(a => a.hayvanId === h.id);
        const adg = calculateADG(hayvanAgirlikKayitlari);
        const adgStatus = getADGStatus(adg, kayit?.hedefGAAKgGun);
        return { ...h, ageDays, kayit, weaningCountdown, growthInfo, adg, adgStatus };
      })
      .sort((a, b) => a.ageDays - b.ageDays),
    [hayvanlar, buzagiKayitlari, tumAgirlikKayitlari]
  );

  // ---- KPI hesapları ----
  const kpiYakin = buzagilar.filter(b => b.weaningCountdown !== null && b.weaningCountdown >= 0 && b.weaningCountdown <= 7).length;
  const kpiEksik = buzagilar.filter(b => !b.kayit?.agizSutuVerildi).length;

  // ---- Filtrelenmiş liste ----
  const filteredBuzagilar = useMemo(() => {
    switch (activeFilter) {
      case 'yakin':
        return buzagilar.filter(b => b.weaningCountdown !== null && b.weaningCountdown >= 0 && b.weaningCountdown <= 7);
      case 'eksik':
        return buzagilar.filter(b => !b.kayit?.agizSutuVerildi);
      default:
        return buzagilar;
    }
  }, [buzagilar, activeFilter]);

  // ---- AKILLI UYARILAR ----
  type UyariLevel = 'kritik' | 'uyari' | 'oneri';
  interface Uyari { level: UyariLevel; icon: string; mesaj: string; kupeNo: string; hayvanId: string; }

  const uyarilar: Uyari[] = useMemo(() => {
    const liste: Uyari[] = [];
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);

    for (const b of buzagilar) {
      // 1. Kritik: Ağız sütü verilmemiş ve buzağı 1+ günlük
      if (!b.kayit?.agizSutuVerildi && b.ageDays >= 1) {
        liste.push({
          level: 'kritik',
          icon: '🍼',
          mesaj: `${b.ageDays} günlük — ağız sütü (kolostrum) kaydı eksik!`,
          kupeNo: b.kupeNo,
          hayvanId: b.id,
        });
      }

      // 2. Kritik: Sütten kesim tarihi geçmiş ama gerçekleşen kaydedilmemiş
      if (b.kayit?.hedefSuttenKesimTarihi && !b.kayit.gerceklesenSuttenKesimTarihi) {
        const hedef = new Date(b.kayit.hedefSuttenKesimTarihi);
        hedef.setHours(0, 0, 0, 0);
        const gecenGun = Math.floor((bugun.getTime() - hedef.getTime()) / 86400000);
        if (gecenGun > 0) {
          liste.push({
            level: 'kritik',
            icon: '✂️',
            mesaj: `Sütten kesim tarihi ${gecenGun} gün önce geçti — gerçekleşen kaydedilmedi.`,
            kupeNo: b.kupeNo,
            hayvanId: b.id,
          });
        }
      }

      // 3. Uyarı: Sütten kesim 3 gün içinde
      if (b.weaningCountdown !== null && b.weaningCountdown >= 0 && b.weaningCountdown <= 3) {
        liste.push({
          level: 'uyari',
          icon: '⏰',
          mesaj: `Sütten kesime ${b.weaningCountdown === 0 ? 'bugün!' : `${b.weaningCountdown} gün kaldı.`}`,
          kupeNo: b.kupeNo,
          hayvanId: b.id,
        });
      }

      // 4. Uyarı: GAA düşük (hedef var ve ADG hesaplanabildi)
      if (b.adgStatus.status === 'Dusuk' && b.adg !== null) {
        liste.push({
          level: 'uyari',
          icon: '📉',
          mesaj: `GAA ${b.adg > 0 ? '+' : ''}${b.adg} kg/gün — hedef GAA'nın altında.`,
          kupeNo: b.kupeNo,
          hayvanId: b.id,
        });
      }

      // 5. Öneri: Starter yem geçişi yaklaşıyor (7-14 günlük, kaydedilmemiş)
      if (b.ageDays >= 7 && b.ageDays <= 14 && !b.kayit?.starterYemBaslangicTarihi) {
        liste.push({
          level: 'oneri',
          icon: '🌾',
          mesaj: `${b.ageDays} günlük — starter yem başlangıç tarihi girilmemiş.`,
          kupeNo: b.kupeNo,
          hayvanId: b.id,
        });
      }
    }

    // Sıralama: kritik > uyarı > öneri
    const sirala: Record<UyariLevel, number> = { kritik: 0, uyari: 1, oneri: 2 };
    return liste.sort((a, b) => sirala[a.level] - sirala[b.level]);
  }, [buzagilar]);

  const uyariRenk: Record<UyariLevel, string> = {
    kritik: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300',
    uyari:  'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50 text-orange-800 dark:text-orange-300',
    oneri:  'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-300',
  };
  const UYARI_LIMIT = 3;

  const filters: { id: FilterType; label: string; count: number; color: string }[] = [
    { id: 'tumu', label: 'Tümü', count: buzagilar.length, color: 'blue' },
    { id: 'yakin', label: '⏰ Sütten Kesim Yakın', count: kpiYakin, color: 'orange' },
    { id: 'eksik', label: '🥛 Ağız Sütü Eksik', count: kpiEksik, color: 'yellow' },
  ];

  // Kart sol-kenarlık rengi
  const getCardAccent = (status: string, weaningCountdown: number | null) => {
    if (weaningCountdown !== null && weaningCountdown >= 0 && weaningCountdown <= 3) return 'border-l-orange-500';
    if (status === 'Başarılı') return 'border-l-green-500';
    if (status === 'Riskli') return 'border-l-yellow-500';
    if (status === 'Geri Kalmış') return 'border-l-red-500';
    return 'border-l-earth-300 dark:border-l-gray-600';
  };

  // Progress bar rengi
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage > 0) return 'bg-red-500';
    return 'bg-earth-200 dark:bg-gray-700';
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col h-full">

        {/* Üst Kısım */}
        <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-earth-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-3 text-blue-800 dark:text-blue-300">
            <PiCow className="w-8 h-8" />
            <div>
              <h2 className="text-xl md:text-2xl font-black">Buzağı Listesi</h2>
              <p className="text-sm text-earth-500 dark:text-gray-400 font-medium">Gelişim takibi ve hedefler</p>
            </div>
          </div>
          <div className='flex gap-2 items-center'>
            <button
              onClick={() => setShowBulkMilkModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-sm border border-green-700/50"
            >
              <Droplet className="w-5 h-5" />
              <span>Toplu Süt Kaydı</span>
            </button>
            {onClose && (
              <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-earth-50 dark:bg-gray-900">

          {/* ---- KPI ÖZET PANOSU ---- */}
          <div className="p-4 pb-0">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {/* Toplam */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <PiCow className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-earth-900 dark:text-gray-100 leading-none">{buzagilar.length}</div>
                  <div className="text-xs text-earth-500 dark:text-gray-400 font-medium mt-0.5">Aktif Buzağı</div>
                </div>
              </div>

              {/* Sütten Kesim Yakın */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-3 cursor-pointer hover:border-orange-300 transition"
                onClick={() => setActiveFilter(activeFilter === 'yakin' ? 'tumu' : 'yakin')}
              >
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-orange-600 dark:text-orange-400 leading-none">{kpiYakin}</div>
                  <div className="text-xs text-earth-500 dark:text-gray-400 font-medium mt-0.5">Sütten Kesim Yakın</div>
                </div>
              </div>

              {/* Ağız Sütü Eksik */}
              <div
                className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-earth-200 dark:border-gray-700 shadow-sm flex items-center space-x-3 cursor-pointer hover:border-yellow-300 transition"
                onClick={() => setActiveFilter(activeFilter === 'eksik' ? 'tumu' : 'eksik')}
              >
                <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
                  <Droplet className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400 leading-none">{kpiEksik}</div>
                  <div className="text-xs text-earth-500 dark:text-gray-400 font-medium mt-0.5">Ağız Sütü Eksik</div>
                </div>
              </div>
            </div>

            {/* ---- AKILLI UYARILAR PANELİ ---- */}
            {uyarilar.length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-earth-500 dark:text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Akıllı Uyarılar ({uyarilar.length})</span>
                  </span>
                  {uyarilar.length > UYARI_LIMIT && (
                    <button
                      onClick={() => setShowAllAlerts(v => !v)}
                      className="text-xs text-blue-500 hover:underline font-bold"
                    >
                      {showAllAlerts ? 'Daha az' : `+${uyarilar.length - UYARI_LIMIT} daha`}
                    </button>
                  )}
                </div>
                {(showAllAlerts ? uyarilar : uyarilar.slice(0, UYARI_LIMIT)).map((u, i) => (
                  <div
                    key={i}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border text-sm ${uyariRenk[u.level]}`}
                  >
                    <span className="text-base flex-shrink-0">{u.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-black">{u.kupeNo}</span>
                      <span className="font-medium"> — {u.mesaj}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCalfForTracking(u.hayvanId); }}
                      className="flex-shrink-0 text-xs font-bold underline hover:no-underline opacity-70 hover:opacity-100 whitespace-nowrap"
                    >
                      Düzenle
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ---- FİLTRE SEKMELERİ ---- */}
            <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-1">
              <Filter className="w-4 h-4 text-earth-400 dark:text-gray-500 flex-shrink-0" />
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition
                    ${activeFilter === f.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-earth-600 dark:text-gray-400 border-earth-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                >
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-black
                      ${activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300'}`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ---- KART LİSTESİ ---- */}
          <div className="px-4 pb-4">
            {filteredBuzagilar.length === 0 ? (
              <div className="text-center py-16 text-earth-400 dark:text-gray-600">
                <PiCow className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">
                  {activeFilter === 'tumu' ? 'Aktif bir buzağı kaydı bulunmuyor.' : 'Bu filtreye uygun buzağı yok.'}
                </p>
                {activeFilter !== 'tumu' && (
                  <button onClick={() => setActiveFilter('tumu')} className="mt-3 text-sm text-blue-500 hover:underline">
                    Tüm buzağıları göster
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBuzagilar.map(buzagi => {
                  const { status, color, percentage } = buzagi.growthInfo;
                  const agizSutuAlert = !buzagi.kayit?.agizSutuVerildi;
                  const countdown = buzagi.weaningCountdown;
                  const cardAccent = getCardAccent(status, countdown);
                  const progressColor = getProgressColor(percentage);
                  const hasTarget = !!buzagi.kayit?.hedefSuttenKesimAgirligiKg;

                  return (
                    <div
                      key={buzagi.id}
                      onClick={() => {
                        if (onSelectCalf) {
                          if (onClose) onClose();
                          onSelectCalf(buzagi.id);
                        } else {
                          navigate(`/hayvanlar?id=${buzagi.id}`);
                        }
                      }}
                      className={`bg-white dark:bg-gray-800 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm transition cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 border-l-4 ${cardAccent} overflow-hidden`}
                    >
                      {/* Kart Başlık */}
                      <div className="p-4 pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h3 className="font-black text-earth-900 dark:text-gray-100 text-base truncate">{buzagi.kupeNo}</h3>
                              <span className="text-xs px-2 py-0.5 bg-earth-100 dark:bg-gray-700 text-earth-600 dark:text-gray-300 font-bold rounded-full">
                                {buzagi.ageDays} Gün
                              </span>
                              {/* Sütten Kesim Geri Sayımı */}
                              {countdown !== null && countdown >= 0 && (
                                <span className={`text-xs px-2 py-0.5 font-bold rounded-full
                                  ${countdown <= 3 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : countdown <= 7 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>
                                  ⏰ {countdown === 0 ? 'Bugün!' : `${countdown} gün`}
                                </span>
                              )}
                              {countdown !== null && countdown < 0 && (
                                <span className="text-xs px-2 py-0.5 font-bold rounded-full bg-earth-100 dark:bg-gray-700 text-earth-500 dark:text-gray-400 line-through">
                                  Geçti
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-earth-500 dark:text-gray-400 mt-0.5">{buzagi.irk} • {buzagi.cinsiyet}</p>
                          </div>

                          {agizSutuAlert && (
                            <div className="text-red-500 flex items-center space-x-1 flex-shrink-0 ml-2" title="Ağız Sütü Bilgisi Eksik!">
                              <AlertCircle className="w-5 h-5" />
                            </div>
                          )}
                        </div>

                        {/* Ağırlık Bilgileri */}
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-earth-50 dark:bg-gray-900 p-2 rounded-lg border border-earth-100 dark:border-gray-700">
                            <div className="text-xs font-bold text-earth-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Mevcut</div>
                            <div className="font-black text-earth-900 dark:text-gray-100 text-lg leading-none">
                              {buzagi.guncelAgirlikKg ? `${buzagi.guncelAgirlikKg} kg` : <span className="text-earth-300 dark:text-gray-600 text-base">—</span>}
                            </div>
                          </div>
                          <div className="bg-earth-50 dark:bg-gray-900 p-2 rounded-lg border border-earth-100 dark:border-gray-700">
                            <div className="text-xs font-bold text-earth-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Hedef</div>
                            <div className="font-black text-earth-900 dark:text-gray-100 text-lg leading-none">
                              {buzagi.kayit?.hedefSuttenKesimAgirligiKg
                                ? `${buzagi.kayit.hedefSuttenKesimAgirligiKg} kg`
                                : <span className="text-earth-300 dark:text-gray-600 text-base">—</span>
                              }
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {hasTarget && (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-earth-500 dark:text-gray-400 font-medium">İlerleme</span>
                              <span className={`text-xs font-bold ${
                                percentage >= 90 ? 'text-green-600 dark:text-green-400'
                                : percentage >= 80 ? 'text-yellow-600 dark:text-yellow-400'
                                : percentage > 0 ? 'text-red-600 dark:text-red-400'
                                : 'text-earth-400 dark:text-gray-500'
                              }`}>
                                {percentage > 0 ? `% ${Math.round(percentage)}` : 'Tartı yok'}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-earth-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                style={{ width: `${Math.min(100, percentage)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Kart Alt Çubuğu */}
                      <div className="px-4 py-2.5 border-t border-earth-100 dark:border-gray-700 bg-earth-50/50 dark:bg-gray-900/50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`flex items-center space-x-1 text-xs font-bold ${buzagi.kayit?.agizSutuVerildi ? 'text-blue-600 dark:text-blue-400' : 'text-earth-400 dark:text-gray-500'}`}>
                            <Droplet className="w-3.5 h-3.5" />
                            <span>{buzagi.kayit?.agizSutuVerildi ? 'Kolostrum ✓' : 'Kolostrum Eksik'}</span>
                          </div>

                          {hasTarget && percentage > 0 && (
                            <>
                              <span className="text-earth-300 dark:text-gray-600 text-xs">•</span>
                              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-xs font-bold ${color}`}>
                                <Activity className="w-3 h-3" />
                                <span>{status}</span>
                              </div>
                            </>
                          )}

                          {/* GAA Rozeti */}
                          {buzagi.adg !== null && (
                            <>
                              <span className="text-earth-300 dark:text-gray-600 text-xs">•</span>
                              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-xs font-bold ${buzagi.adgStatus.color}`}
                                title={`Hedef GAA: ${buzagi.kayit?.hedefGAAKgGun ?? 'girilmemiş'} kg/gün`}>
                                <TrendingUp className="w-3 h-3" />
                                <span>GAA {buzagi.adg > 0 ? '+' : ''}{buzagi.adg} kg/g</span>
                              </div>
                            </>
                          )}

                          {!hasTarget && buzagi.adg === null && (
                            <>
                              <span className="text-earth-300 dark:text-gray-600 text-xs">•</span>
                              <div className="text-xs text-earth-400 dark:text-gray-500 italic">Hedef yok</div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Süt Kayıt Butonu */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCalfForMilk(buzagi.id); }}
                            className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition border border-green-200 dark:border-green-800/50"
                            title="Süt / Mama Kayıt"
                          >
                            <Droplet className="w-5 h-5" />
                          </button>
                          {/* Büyütme Takibi Düzenleme */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCalfForTracking(buzagi.id); }}
                            className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition border border-blue-200 dark:border-blue-800/50"
                            title="Büyütme Takibi Düzenle"
                          >
                            <ClipboardEdit className="w-5 h-5" />
                          </button>
                          <ChevronRight className="w-5 h-5 text-earth-300 dark:text-gray-600 ml-1" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCalfForTracking && (
        <CalfFormModal
          hayvanId={selectedCalfForTracking}
          onClose={() => setSelectedCalfForTracking(null)}
        />
      )}
      {selectedCalfForMilk && (() => {
        const hayvan = hayvanlar.find(h => h.id === selectedCalfForMilk);
        return hayvan ? (
          <CalfMilkModal
            hayvan={hayvan}
            onClose={() => setSelectedCalfForMilk(null)}
          />
        ) : null;
      })()}

      {showBulkMilkModal && (
        <BulkMilkModal
          buzagilar={buzagilar}
          onClose={() => setShowBulkMilkModal(false)}
        />
      )}
    </div>
  );
};

export default CalfList;
