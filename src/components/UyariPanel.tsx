import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  TrendingDown,
  Scale,
  Heart,
  Clock,
  Activity,
  CreditCard
} from 'lucide-react';
import type { UyariItem, UyariTipi, UyariSiddeti } from '../types';

// ─── Sabitler ─────────────────────────────────────────────────────────────

const SIDDET_STIL: Record<UyariSiddeti, {
  kart: string;
  ikon: string;
  rozet: string;
  Ikon: React.ComponentType<{ className?: string }>;
}> = {
  KRITIK: {
    kart: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
    ikon: 'text-red-600 dark:text-red-400',
    rozet: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    Ikon: AlertTriangle,
  },
  ORTA: {
    kart: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
    ikon: 'text-amber-600 dark:text-amber-400',
    rozet: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    Ikon: AlertCircle,
  },
  DUSUK: {
    kart: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50',
    ikon: 'text-blue-500 dark:text-blue-400',
    rozet: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    Ikon: Info,
  },
};

const TIP_IKON: Record<UyariTipi, React.ComponentType<{ className?: string }>> = {
  SUT_DUSUS: TrendingDown,
  AGIRLIK_SAPMA: Scale,
  UREME_GECIKME: Heart,
  LAKTASYON_UZADI: Clock,
  KIZGINLIK_BEKLIYOR: Heart,
  KURUYA_CIKARMA_GECIKTI: Clock,
  YUKSEK_SOMATIK_HUCRE: Activity,
  NEGATIF_ADG: TrendingDown,
  YUKSEK_SAGLIK_MALIYETI: CreditCard,
  KURU_DONEM_BESLEME: Clock,
};

const TIP_ETIKET: Record<UyariTipi, string> = {
  SUT_DUSUS: 'Süt Düşüşü',
  AGIRLIK_SAPMA: 'Ağırlık Sapması',
  UREME_GECIKME: 'Üreme Gecikmesi',
  LAKTASYON_UZADI: 'Uzamış Laktasyon',
  KIZGINLIK_BEKLIYOR: 'Kızgınlık Bekleniyor',
  KURUYA_CIKARMA_GECIKTI: 'Kuruya Çıkarma Gecikti',
  YUKSEK_SOMATIK_HUCRE: 'Yüksek Somatik Hücre',
  NEGATIF_ADG: 'Negatif Büyüme (Kilo Kaybı)',
  YUKSEK_SAGLIK_MALIYETI: 'Yüksek Sağlık Maliyeti',
  KURU_DONEM_BESLEME: 'Kuru Dönem Beslemesi Yaklaşıyor',
};

const SIDDET_ETIKET: Record<UyariSiddeti, string> = {
  KRITIK: 'Kritik',
  ORTA: 'Orta',
  DUSUK: 'Düşük',
};

// ─── Alt Bilesен: Tek Uyari Satiri ────────────────────────────────────────

interface UyariSatiriProps {
  uyari: UyariItem;
  onClick: () => void;
}

const UyariSatiri: React.FC<UyariSatiriProps> = ({ uyari, onClick }) => {
  const stil = SIDDET_STIL[uyari.siddet];
  const TipIkon = TIP_IKON[uyari.tip];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 hover:brightness-95 active:scale-[0.99] ${stil.kart}`}
    >
      <div className={`mt-0.5 shrink-0 ${stil.ikon}`}>
        <TipIkon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm text-earth-900 dark:text-gray-100">
            {uyari.hayvanKupeNo}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${stil.rozet}`}>
            {TIP_ETIKET[uyari.tip]}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${stil.rozet}`}>
            {SIDDET_ETIKET[uyari.siddet]}
          </span>
        </div>
        <p className="text-sm text-earth-700 dark:text-gray-300 mt-0.5 font-medium">
          {uyari.mesaj}
        </p>
        {uyari.detay && (
          <p className="text-xs text-earth-500 dark:text-gray-400 mt-0.5">
            {uyari.detay}
          </p>
        )}
      </div>
      <div className={`shrink-0 mt-0.5 ${stil.ikon}`}>
        <stil.Ikon className="w-4 h-4" />
      </div>
    </button>
  );
};

// ─── Ana Bilesен ──────────────────────────────────────────────────────────

interface UyariPanelProps {
  uyarilar: UyariItem[];
}

const UyariPanel: React.FC<UyariPanelProps> = ({ uyarilar }) => {
  const navigate = useNavigate();

  const kritikSayisi = uyarilar.filter((u) => u.siddet === 'KRITIK').length;
  const ortaSayisi   = uyarilar.filter((u) => u.siddet === 'ORTA').length;

  if (uyarilar.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-5 flex items-center gap-4">
        <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-xl">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="font-black text-emerald-900 dark:text-emerald-300">
            Sürünüz Sağlıklı
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
            Tespit edilen anomali veya gecikme bulunmuyor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-red-100 dark:bg-red-900/40 p-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-black text-earth-900 dark:text-gray-100 text-base">
              Akıllı Uyarılar
            </h3>
            <p className="text-xs text-earth-500 dark:text-gray-400">
              Sürünüzdeki anomaliler otomatik tespit edildi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {kritikSayisi > 0 && (
            <span className="flex items-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {kritikSayisi} Kritik
            </span>
          )}
          {ortaSayisi > 0 && (
            <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" />
              {ortaSayisi} Orta
            </span>
          )}
        </div>
      </div>
      
      {/* 4 öğe sığacak (her biri yaklaşık 90-100px) max-h-[420px] ile kaydırma eklendi */}
      <div className="p-4 space-y-2.5 overflow-y-auto max-h-[420px] custom-scrollbar">
        {uyarilar.map((uyari) => (
          <UyariSatiri
            key={uyari.id}
            uyari={uyari}
            onClick={() => {
              if (uyari.linkTo) navigate(uyari.linkTo);
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default UyariPanel;