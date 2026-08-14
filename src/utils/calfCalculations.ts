export type GrowthStatus = 'Başarılı' | 'Riskli' | 'Geri Kalmış' | 'Bilinmiyor';

export const calculateGrowthStatus = (
  currentWeightKg?: number,
  targetWeightKg?: number
): { status: GrowthStatus; color: string; percentage: number } => {
  if (!currentWeightKg || !targetWeightKg || targetWeightKg <= 0) {
    return { status: 'Bilinmiyor', color: 'text-earth-500 bg-earth-100 border-earth-300', percentage: 0 };
  }

  const percentage = (currentWeightKg / targetWeightKg) * 100;

  if (percentage >= 90) {
    return { status: 'Başarılı', color: 'text-green-700 bg-green-100 border-green-300', percentage };
  } else if (percentage >= 80) {
    return { status: 'Riskli', color: 'text-yellow-700 bg-yellow-100 border-yellow-300', percentage };
  } else {
    return { status: 'Geri Kalmış', color: 'text-red-700 bg-red-100 border-red-300', percentage };
  }
};

export const calculateAgeInDays = (birthDateStr: string): number => {
  const birth = new Date(birthDateStr);
  birth.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, today.getTime() - birth.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateTargetWeaningDate = (birthDateStr: string, weaningAgeDays: number = 60): string => {
  const d = new Date(birthDateStr);
  d.setDate(d.getDate() + weaningAgeDays);
  return d.toISOString().split('T')[0];
};

/**
 * Verilen agirlik kayitlari listesinden Gunde Agirlik Artisi (GAA / ADG) hesaplar.
 * En eski ve en yeni tartim arasindaki kgfarki / gun farkini dondurur.
 * En az 2 kayit gereklidir, yoksa null doner.
 */
export const calculateADG = (
  agirlikKayitlari: Array<{ tarih: string; kg: number }>
): number | null => {
  if (!agirlikKayitlari || agirlikKayitlari.length < 2) return null;

  const sorted = [...agirlikKayitlari].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const dayDiff = Math.max(
    1,
    Math.round(
      (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const kgDiff = last.kg - first.kg;
  return Math.round((kgDiff / dayDiff) * 100) / 100; // 2 ondalik basamak
};

export type ADGStatus = 'Hedef Ustu' | 'Normal' | 'Dusuk' | 'Bilinmiyor';

/**
 * Hesaplanan GAA degerini kullanicinin girecegi hedef GAA ile karsilastirir.
 */
export const getADGStatus = (
  adg: number | null,
  hedefGAA?: number
): { status: ADGStatus; color: string } => {
  if (adg === null || !hedefGAA || hedefGAA <= 0) {
    return { status: 'Bilinmiyor', color: 'text-earth-400 bg-earth-100 border-earth-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400' };
  }
  const oran = adg / hedefGAA;
  if (oran >= 1) return { status: 'Hedef Ustu', color: 'text-green-700 bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400' };
  if (oran >= 0.8) return { status: 'Normal', color: 'text-yellow-700 bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400' };
  return { status: 'Dusuk', color: 'text-red-700 bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400' };
};
