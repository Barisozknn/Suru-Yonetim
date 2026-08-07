import type { Hayvan, SutKaydi, AgirlikKaydi, SaglikOlayi, SkorDetay } from '../types';

// H2 Katsayıları (Kalıtım Dereceleri)
const H2 = {
  SUT_VERIMI: 0.30,
  BUYUME_ADG: 0.40,
  FERTILITE: 0.05,
  SAGLIK: 0.10,
  DOGUM_KOLAYLIGI: 0.15
};

// ─── Yardımcı: Hayvan Başına Sürü Ortalaması ────────────────────────────────
export const calcHerdMilkAvg = (sutKayitlari: SutKaydi[]): number => {
  if (sutKayitlari.length === 0) return 0;
  const byAnimal: Record<string, number[]> = {};
  sutKayitlari.forEach(r => {
    if (!byAnimal[r.hayvanId]) byAnimal[r.hayvanId] = [];
    byAnimal[r.hayvanId].push(r.litre);
  });
  const perAnimal = Object.values(byAnimal).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length);
  return perAnimal.reduce((a, b) => a + b, 0) / perAnimal.length;
};

export const calcHerdWeightAvg = (agirlikKayitlari: AgirlikKaydi[]): number => {
  if (agirlikKayitlari.length === 0) return 0;
  const byAnimal: Record<string, number[]> = {};
  agirlikKayitlari.forEach(r => {
    if (!byAnimal[r.hayvanId]) byAnimal[r.hayvanId] = [];
    byAnimal[r.hayvanId].push(r.kg);
  });
  const perAnimal = Object.values(byAnimal).map(arr => arr.reduce((a, b) => a + b, 0) / arr.length);
  return perAnimal.reduce((a, b) => a + b, 0) / perAnimal.length;
};

// ─── Çevresel Düzeltme Fonksiyonları ────────────────────────────────────────
export const correctForSeason = (value: number, date: string): number => {
  const month = new Date(date).getMonth() + 1;
  if (month >= 6 && month <= 8) {
    return value * 1.10;
  }
  return value;
};

export const correctForLactation = (milkLitre: number, lactNo: number): number => {
  let corrected = milkLitre;
  if (lactNo === 1) corrected *= 1.20;
  else if (lactNo === 2) corrected *= 1.10;
  return corrected;
};

export const applyHeritability = (correctedValue: number, h2: number): number => {
  return correctedValue * h2;
};

export const calculateReliability = (dataPointCount: number): number => {
  if (dataPointCount === 0) return 0;
  return Math.min(99, Math.round((dataPointCount / (dataPointCount + 5)) * 100));
};

// ─── Süt Verimi TDİ ─────────────────────────────────────────────────────────
export const calculateMilkTDI = (hayvan: Hayvan, sutKayitlari: SutKaydi[], suruOrtalamasi: number): SkorDetay => {
  const records = sutKayitlari.filter(r => r.hayvanId === hayvan.id);
  if (records.length === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.SUT_VERIMI, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

  const avgMilk = records.reduce((sum, r) => sum + r.litre, 0) / records.length;
  const seasonCorrected = correctForSeason(avgMilk, records[0].tarih);
  const corrected = correctForLactation(seasonCorrected, 1);

  const genetikTahmin = applyHeritability(corrected - suruOrtalamasi, H2.SUT_VERIMI);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + (genetikTahmin * 2)));

  return {
    hamDeger: avgMilk,
    cevreselDuzeltme: corrected - avgMilk,
    duzeltilmisDeger: corrected,
    h2Katsayisi: H2.SUT_VERIMI,
    genetikTahmin,
    normalizedSkor,
    guvenilirlik: calculateReliability(records.length),
    veriSayisi: records.length
  };
};

// ─── Büyüme (ADG) TDİ ───────────────────────────────────────────────────────
export const calculateGrowthTDI = (hayvan: Hayvan, agirlikKayitlari: AgirlikKaydi[], suruOrtalamasi: number): SkorDetay => {
  const records = agirlikKayitlari
    .filter(r => r.hayvanId === hayvan.id)
    .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

  if (records.length === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.BUYUME_ADG, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

  let adg: number;
  if (records.length >= 2) {
    const first = records[0];
    const last = records[records.length - 1];
    const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
    adg = ((last.kg - first.kg) / gunFarki) * 1000;
  } else {
    adg = records[0].kg;
  }

  const genetikTahmin = applyHeritability(adg - suruOrtalamasi, H2.BUYUME_ADG);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + (genetikTahmin * 0.05)));

  return {
    hamDeger: adg,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: adg,
    h2Katsayisi: H2.BUYUME_ADG,
    genetikTahmin,
    normalizedSkor,
    guvenilirlik: calculateReliability(records.length),
    veriSayisi: records.length
  };
};

// ─── Sağlık TDİ ─────────────────────────────────────────────────────────────
export const calculateHealthTDI = (hayvan: Hayvan, saglikOlaylari: SaglikOlayi[]): SkorDetay => {
  const records = saglikOlaylari.filter(r => r.hayvanId === hayvan.id);

  let penaltiPuani = 0;
  records.forEach(r => {
    if (r.tur === 'Operasyon') penaltiPuani += 3;
    else if (r.tur === 'İlaç') penaltiPuani += 2;
    else if (r.tur === 'Muayene') penaltiPuani += 0.5;
  });

  const hamDeger = penaltiPuani;
  const genetikTahmin = applyHeritability(-penaltiPuani, H2.SAGLIK);
  const normalizedSkor = Math.max(0, Math.min(100, 60 + (genetikTahmin * 5)));

  return {
    hamDeger,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: hamDeger,
    h2Katsayisi: H2.SAGLIK,
    genetikTahmin,
    normalizedSkor: records.length === 0 ? 65 : normalizedSkor,
    guvenilirlik: calculateReliability(records.length),
    veriSayisi: records.length
  };
};

// ─── Genel TDİ ──────────────────────────────────────────────────────────────
export const calculateOverallTDI = (
  sutSkoru: SkorDetay | undefined,
  buyumeSkoru: SkorDetay,
  saglikSkoru: SkorDetay,
  isletmeTipi: 'Süt' | 'Besi' | 'Karma'
): number => {
  let wSut = 0, wBuyume = 0, wSaglik = 0;

  if (isletmeTipi === 'Süt') {
    wSut = 0.60; wBuyume = 0.20; wSaglik = 0.20;
  } else if (isletmeTipi === 'Besi') {
    wSut = 0.05; wBuyume = 0.70; wSaglik = 0.25;
  } else {
    wSut = 0.35; wBuyume = 0.35; wSaglik = 0.30;
  }

  const s = sutSkoru?.normalizedSkor ?? 50;
  const b = buyumeSkoru.normalizedSkor;
  const h = saglikSkoru.normalizedSkor;

  return (s * wSut) + (b * wBuyume) + (h * wSaglik);
};

// ─── Pedigri / Inbreeding ────────────────────────────────────────────────────
export const findAncestors = (hayvanId: string, hayvanlar: Hayvan[], depth: number = 3): string[] => {
  if (depth === 0) return [];
  const h = hayvanlar.find(x => x.id === hayvanId);
  if (!h) return [];

  let ancestors: string[] = [];
  if (h.anneKupeNo) {
    const anne = hayvanlar.find(x => x.kupeNo === h.anneKupeNo);
    if (anne) {
      ancestors.push(anne.id);
      ancestors = ancestors.concat(findAncestors(anne.id, hayvanlar, depth - 1));
    }
  }
  if (h.babaKupeNo) {
    const baba = hayvanlar.find(x => x.kupeNo === h.babaKupeNo);
    if (baba) {
      ancestors.push(baba.id);
      ancestors = ancestors.concat(findAncestors(baba.id, hayvanlar, depth - 1));
    }
  }
  return Array.from(new Set(ancestors));
};

export const calculateInbreedingCoeff = (sireId: string | null, damId: string | null, hayvanlar: Hayvan[]): number => {
  if (!sireId || !damId) return 0;

  const sireAncestors = findAncestors(sireId, hayvanlar);
  const damAncestors = findAncestors(damId, hayvanlar);

  const common = sireAncestors.filter(x => damAncestors.includes(x));

  let f = 0;
  if (common.length > 0) {
    if (sireAncestors.includes(damId) || damAncestors.includes(sireId)) return 0.25;
    f = Math.min(common.length * 0.0625, 0.25);
  }
  return f;
};
