import type { Hayvan, SutKaydi, AgirlikKaydi, SaglikOlayi, UremeKaydi, SkorDetay } from '../types';

// H2 Katsayıları (Kalıtım Dereceleri)
const H2 = {
  SUT_VERIMI: 0.30,
  BUYUME_ADG: 0.40,
  FERTILITE: 0.05,
  SAGLIK: 0.10,
  DOGUM_KOLAYLIGI: 0.15
};

// ─── Yardımcı İstatistik Fonksiyonları ────────────────────────────────

export const calcHerdMilkAvg = (sutKayitlari: SutKaydi[]): number => {
  if (sutKayitlari.length === 0) return 0;
  const byAnimalAndDate: Record<string, Record<string, number>> = {};
  
  sutKayitlari.forEach(r => {
    if (!byAnimalAndDate[r.hayvanId]) byAnimalAndDate[r.hayvanId] = {};
    const dateStr = new Date(r.tarih).toISOString().split('T')[0];
    byAnimalAndDate[r.hayvanId][dateStr] = (byAnimalAndDate[r.hayvanId][dateStr] || 0) + r.litre;
  });

  const perAnimal = Object.values(byAnimalAndDate).map(dateRecords => {
    const dailyTotals = Object.values(dateRecords);
    return dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
  });

  if (perAnimal.length === 0) return 0;
  return perAnimal.reduce((a, b) => a + b, 0) / perAnimal.length;
};

export const calcHerdMilkStdDev = (sutKayitlari: SutKaydi[], avg: number): number => {
  if (sutKayitlari.length === 0) return 1;
  const byAnimalAndDate: Record<string, Record<string, number>> = {};
  
  sutKayitlari.forEach(r => {
    if (!byAnimalAndDate[r.hayvanId]) byAnimalAndDate[r.hayvanId] = {};
    const dateStr = new Date(r.tarih).toISOString().split('T')[0];
    byAnimalAndDate[r.hayvanId][dateStr] = (byAnimalAndDate[r.hayvanId][dateStr] || 0) + r.litre;
  });

  const perAnimal = Object.values(byAnimalAndDate).map(dateRecords => {
    const dailyTotals = Object.values(dateRecords);
    return dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
  });

  if (perAnimal.length < 2) return 1;
  const sumOfSquares = perAnimal.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  return Math.sqrt(sumOfSquares / (perAnimal.length - 1)) || 1;
};

export const calcHerdADGAvg = (agirlikKayitlari: AgirlikKaydi[], hayvanlar: Hayvan[]): number => {
  if (agirlikKayitlari.length === 0) return 0;
  
  const byAnimal: Record<string, AgirlikKaydi[]> = {};
  agirlikKayitlari.forEach(r => {
    if (!byAnimal[r.hayvanId]) byAnimal[r.hayvanId] = [];
    byAnimal[r.hayvanId].push(r);
  });

  let totalAdg = 0;
  let validAnimals = 0;

  Object.entries(byAnimal).forEach(([hayvanId, records]) => {
    records.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
    let adg = 0;
    if (records.length >= 2) {
      const first = records[0];
      const last = records[records.length - 1];
      const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
      adg = ((last.kg - first.kg) / gunFarki) * 1000;
    } else if (records.length === 1) {
      const hayvan = hayvanlar.find(h => h.id === hayvanId);
      if (hayvan && hayvan.dogumTarihi) {
        const gunFarki = Math.max(1, (new Date(records[0].tarih).getTime() - new Date(hayvan.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
        adg = ((records[0].kg - 40) / gunFarki) * 1000;
      }
    }
    
    if (adg > -1500 && adg < 4000) {
      totalAdg += adg;
      validAnimals++;
    }
  });

  return validAnimals > 0 ? totalAdg / validAnimals : 0;
};

export const calcHerdADGStdDev = (agirlikKayitlari: AgirlikKaydi[], hayvanlar: Hayvan[], avg: number): number => {
  if (agirlikKayitlari.length === 0) return 1;
  const byAnimal: Record<string, AgirlikKaydi[]> = {};
  agirlikKayitlari.forEach(r => {
    if (!byAnimal[r.hayvanId]) byAnimal[r.hayvanId] = [];
    byAnimal[r.hayvanId].push(r);
  });

  const perAnimal: number[] = [];
  Object.entries(byAnimal).forEach(([hayvanId, records]) => {
    records.sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
    let adg = 0;
    if (records.length >= 2) {
      const first = records[0];
      const last = records[records.length - 1];
      const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
      adg = ((last.kg - first.kg) / gunFarki) * 1000;
    } else if (records.length === 1) {
      const hayvan = hayvanlar.find(h => h.id === hayvanId);
      if (hayvan && hayvan.dogumTarihi) {
        const gunFarki = Math.max(1, (new Date(records[0].tarih).getTime() - new Date(hayvan.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
        adg = ((records[0].kg - 40) / gunFarki) * 1000;
      }
    }
    
    if (adg > -1500 && adg < 4000) {
      perAnimal.push(adg);
    }
  });

  if (perAnimal.length < 2) return 1;
  const sumOfSquares = perAnimal.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  return Math.sqrt(sumOfSquares / (perAnimal.length - 1)) || 1;
};

// Sağlık
export const calcHerdHealthAvg = (saglikOlaylari: SaglikOlayi[], hayvanlar: Hayvan[]): number => {
  if (hayvanlar.length === 0 || saglikOlaylari.length === 0) return 0;
  
  let totalPenalty = 0;
  saglikOlaylari.forEach(r => {
    if (r.tur === 'Operasyon') totalPenalty += 3;
    else if (r.tur === 'İlaç') totalPenalty += 2;
    else if (r.tur === 'Muayene') totalPenalty += 0.5;
  });
  
  return totalPenalty / hayvanlar.length;
};

export const calcHerdHealthStdDev = (saglikOlaylari: SaglikOlayi[], hayvanlar: Hayvan[], avg: number): number => {
  if (hayvanlar.length < 2 || saglikOlaylari.length === 0) return 1;

  const penaltiesByAnimal: Record<string, number> = {};
  hayvanlar.forEach(h => penaltiesByAnimal[h.id] = 0);
  
  saglikOlaylari.forEach(r => {
    if (penaltiesByAnimal[r.hayvanId] !== undefined) {
      if (r.tur === 'Operasyon') penaltiesByAnimal[r.hayvanId] += 3;
      else if (r.tur === 'İlaç') penaltiesByAnimal[r.hayvanId] += 2;
      else if (r.tur === 'Muayene') penaltiesByAnimal[r.hayvanId] += 0.5;
    }
  });

  const penalties = Object.values(penaltiesByAnimal);
  const sumOfSquares = penalties.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  return Math.sqrt(sumOfSquares / (penalties.length - 1)) || 1;
};

// Fertilite (CR)
export const calcHerdFertilityAvg = (uremeKayitlari: UremeKaydi[]): number => {
  const tohumlamalar = uremeKayitlari.filter(r => r.tur === 'Tohumlama/Aşım' || r.tur === 'Doğal Aşım').length;
  const gebelikler = uremeKayitlari.filter(r => r.tur === 'Gebelik Kontrolü' && r.durum === 'Gebe').length;
  const dogumlar = uremeKayitlari.filter(r => r.tur === 'Doğum').length;
  
  const gercekBasari = Math.min(tohumlamalar, Math.max(gebelikler, dogumlar));
  if (tohumlamalar === 0) return 0;
  return gercekBasari / tohumlamalar;
};

export const calcHerdFertilityStdDev = (uremeKayitlari: UremeKaydi[], hayvanlar: Hayvan[], avg: number): number => {
  if (hayvanlar.length < 2) return 0.1;

  const crByAnimal: Record<string, { t: number, b: number }> = {};
  hayvanlar.forEach(h => crByAnimal[h.id] = { t: 0, b: 0 });

  uremeKayitlari.forEach(r => {
    if (!crByAnimal[r.hayvanId]) return;
    if (r.tur === 'Tohumlama/Aşım' || r.tur === 'Doğal Aşım') crByAnimal[r.hayvanId].t += 1;
    if (r.tur === 'Gebelik Kontrolü' && r.durum === 'Gebe') crByAnimal[r.hayvanId].b += 1;
    if (r.tur === 'Doğum') crByAnimal[r.hayvanId].b += 1;
  });

  const crs: number[] = [];
  Object.values(crByAnimal).forEach(stats => {
    if (stats.t > 0) {
      const success = Math.min(stats.t, stats.b);
      crs.push(success / stats.t);
    }
  });

  if (crs.length < 2) return 0.1;
  const sumOfSquares = crs.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
  return Math.sqrt(sumOfSquares / (crs.length - 1)) || 0.1;
};

// ─── Çevresel Düzeltme Fonksiyonları ────────────────────────────────────────
export const correctForSeason = (value: number, _date: string): number => {
  return value;
};

export const correctForLactation = (milkLitre: number, lactNo: number): number => {
  let corrected = milkLitre;
  if (lactNo === 1) corrected *= 1.20; 
  else if (lactNo === 2) corrected *= 1.10;
  else if (lactNo >= 5) corrected *= 1.05;
  return corrected;
};

export const applyHeritability = (correctedValue: number, h2: number): number => {
  return correctedValue * h2;
};

export const calculateReliability = (dataPointCount: number, h2: number): number => {
  if (dataPointCount === 0) return 0;
  const r2 = (dataPointCount * h2) / ((dataPointCount * h2) + (1 - h2));
  return Math.min(99, Math.round(r2 * 100));
};

// ─── Süt Verimi TDİ ─────────────────────────────────────────────────────────
export const calculateMilkTDI = (
  hayvan: Hayvan, 
  sutKayitlari: SutKaydi[], 
  suruOrtalamasi: number, 
  suruStdDev: number,
  hayvanlar: Hayvan[] = [],
  uremeKayitlari: UremeKaydi[] = []
): SkorDetay => {
  let records = sutKayitlari.filter(r => r.hayvanId === hayvan.id);

  if (hayvan.tur === 'Boğa') {
    const kizlar = hayvanlar.filter(h => h.babaKupeNo === hayvan.kupeNo && h.cinsiyet === 'Dişi');
    const kizIdleri = kizlar.map(k => k.id);
    records = sutKayitlari.filter(r => kizIdleri.includes(r.hayvanId));
  }

  if (records.length === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.SUT_VERIMI, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

  let laktasyonNo = 1;
  if (hayvan.tur !== 'Boğa') {
    const dogumlar = uremeKayitlari.filter(r => r.hayvanId === hayvan.id && r.tur === 'Doğum');
    if (dogumlar.length > 0) laktasyonNo = dogumlar.length;
  }

  const byDate: Record<string, number> = {};
  records.forEach(r => {
    const d = new Date(r.tarih).toISOString().split('T')[0];
    byDate[d] = (byDate[d] || 0) + r.litre;
  });
  
  const dailyTotals = Object.values(byDate);
  const avgMilk = dailyTotals.reduce((sum, v) => sum + v, 0) / dailyTotals.length;
  
  const seasonCorrected = correctForSeason(avgMilk, records[0].tarih);
  const corrected = correctForLactation(seasonCorrected, laktasyonNo);

  const genetikTahmin = applyHeritability(corrected - suruOrtalamasi, H2.SUT_VERIMI);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + (genetikTahmin / Math.max(0.1, suruStdDev)) * 15));

  return {
    hamDeger: avgMilk,
    cevreselDuzeltme: corrected - avgMilk,
    duzeltilmisDeger: corrected,
    h2Katsayisi: H2.SUT_VERIMI,
    genetikTahmin,
    normalizedSkor,
    guvenilirlik: calculateReliability(records.length, H2.SUT_VERIMI),
    veriSayisi: records.length
  };
};

// ─── Büyüme (ADG) TDİ ───────────────────────────────────────────────────────
export const calculateGrowthTDI = (hayvan: Hayvan, agirlikKayitlari: AgirlikKaydi[], suruOrtalamasi: number, suruStdDev: number): SkorDetay => {
  const records = agirlikKayitlari
    .filter(r => r.hayvanId === hayvan.id)
    .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

  if (records.length === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.BUYUME_ADG, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

  let adg = 0;
  if (records.length >= 2) {
    const first = records[0];
    const last = records[records.length - 1];
    const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
    adg = ((last.kg - first.kg) / gunFarki) * 1000;
  } else if (records.length === 1 && hayvan.dogumTarihi) {
    const last = records[0];
    const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(hayvan.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
    adg = ((last.kg - 40) / gunFarki) * 1000;
  }

  adg = Math.max(-1500, Math.min(4000, adg));

  const genetikTahmin = applyHeritability(adg - suruOrtalamasi, H2.BUYUME_ADG);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + (genetikTahmin / Math.max(1, suruStdDev)) * 15));

  return {
    hamDeger: adg,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: adg,
    h2Katsayisi: H2.BUYUME_ADG,
    genetikTahmin,
    normalizedSkor: adg === 0 ? 50 : normalizedSkor,
    guvenilirlik: calculateReliability(records.length, H2.BUYUME_ADG),
    veriSayisi: records.length
  };
};

// ─── Sağlık TDİ ─────────────────────────────────────────────────────────────
export const calculateHealthTDI = (hayvan: Hayvan, saglikOlaylari: SaglikOlayi[], suruOrtSaglik: number, suruStdDevSaglik: number): SkorDetay => {
  const records = saglikOlaylari.filter(r => r.hayvanId === hayvan.id);

  let penaltiPuani = 0;
  records.forEach(r => {
    if (r.tur === 'Operasyon') penaltiPuani += 3;
    else if (r.tur === 'İlaç') penaltiPuani += 2;
    else if (r.tur === 'Muayene') penaltiPuani += 0.5;
  });

  const hamDeger = penaltiPuani;
  const sapma = suruOrtSaglik - penaltiPuani;
  const genetikTahmin = applyHeritability(sapma, H2.SAGLIK);
  
  const normalizedSkor = Math.max(0, Math.min(100, 50 + (genetikTahmin / Math.max(0.1, suruStdDevSaglik)) * 15));

  return {
    hamDeger,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: hamDeger,
    h2Katsayisi: H2.SAGLIK,
    genetikTahmin,
    normalizedSkor,
    guvenilirlik: calculateReliability(records.length, H2.SAGLIK),
    veriSayisi: records.length
  };
};

// ─── Üreme (Fertilite) TDİ ──────────────────────────────────────────────────
export const calculateFertilityTDI = (
  hayvan: Hayvan, 
  uremeKayitlari: UremeKaydi[], 
  suruOrtCR: number,
  suruStdDevCR: number,
  hayvanlar: Hayvan[] = []
): SkorDetay => {
  let records = uremeKayitlari.filter(r => r.hayvanId === hayvan.id);

  if (hayvan.tur === 'Boğa') {
    const kizlar = hayvanlar.filter(h => h.babaKupeNo === hayvan.kupeNo && h.cinsiyet === 'Dişi');
    const kizIdleri = kizlar.map(k => k.id);
    records = uremeKayitlari.filter(r => kizIdleri.includes(r.hayvanId));
  }

  if (records.length === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.FERTILITE, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

  const tohumlamalar = records.filter(r => r.tur === 'Tohumlama/Aşım' || r.tur === 'Doğal Aşım').length;
  let basarili = 0;
  
  records.forEach(r => {
    if (r.tur === 'Doğum') basarili++;
    else if (r.tur === 'Gebelik Kontrolü' && r.durum === 'Gebe') basarili++;
  });

  const gercekBasari = Math.min(tohumlamalar, basarili);
  const cr = tohumlamalar > 0 ? (gercekBasari / tohumlamalar) : (basarili > 0 ? 1 : 0);

  const sapma = cr - suruOrtCR;
  const genetikTahmin = applyHeritability(sapma, H2.FERTILITE);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + (genetikTahmin / Math.max(0.01, suruStdDevCR)) * 15));

  return {
    hamDeger: cr,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: cr,
    h2Katsayisi: H2.FERTILITE,
    genetikTahmin,
    normalizedSkor,
    guvenilirlik: calculateReliability(records.length, H2.FERTILITE),
    veriSayisi: records.length
  };
};

// ─── Genel TDİ ──────────────────────────────────────────────────────────────
export const calculateOverallTDI = (
  sutSkoru: SkorDetay | undefined,
  buyumeSkoru: SkorDetay,
  saglikSkoru: SkorDetay,
  uremeSkoru: SkorDetay,
  isletmeTipi: 'Süt' | 'Besi' | 'Karma'
): number => {
  let wSut = 0, wBuyume = 0, wSaglik = 0, wUreme = 0;

  if (isletmeTipi === 'Süt') {
    wSut = 0.50; wBuyume = 0.15; wSaglik = 0.15; wUreme = 0.20;
  } else if (isletmeTipi === 'Besi') {
    wSut = 0.05; wBuyume = 0.60; wSaglik = 0.15; wUreme = 0.20;
  } else {
    wSut = 0.30; wBuyume = 0.30; wSaglik = 0.20; wUreme = 0.20;
  }

  const s = sutSkoru?.normalizedSkor ?? 50;
  const b = buyumeSkoru.normalizedSkor ?? 50;
  const h = saglikSkoru.normalizedSkor ?? 50;
  const u = uremeSkoru.normalizedSkor ?? 50;

  return (s * wSut) + (b * wBuyume) + (h * wSaglik) + (u * wUreme);
};

// ─── Pedigri / Inbreeding (Wright's Inbreeding Coefficient) ──────────────────
interface AncestorNode {
  id: string;
  depth: number;
}

export const getAncestorsWithDepth = (hayvanId: string, hayvanlar: Hayvan[], currentDepth: number = 0, maxDepth: number = 3): AncestorNode[] => {
  if (currentDepth > maxDepth) return [];
  const h = hayvanlar.find(x => x.id === hayvanId);
  if (!h) return [];

  let nodes: AncestorNode[] = [{ id: h.id, depth: currentDepth }];
  
  if (h.anneKupeNo) {
    const anne = hayvanlar.find(x => x.kupeNo === h.anneKupeNo);
    if (anne) {
      nodes = nodes.concat(getAncestorsWithDepth(anne.id, hayvanlar, currentDepth + 1, maxDepth));
    }
  }
  if (h.babaKupeNo) {
    const baba = hayvanlar.find(x => x.kupeNo === h.babaKupeNo);
    if (baba) {
      nodes = nodes.concat(getAncestorsWithDepth(baba.id, hayvanlar, currentDepth + 1, maxDepth));
    }
  }
  return nodes;
};

export const calculateInbreedingCoeff = (sireId: string | null, damId: string | null, hayvanlar: Hayvan[]): number => {
  if (!sireId || !damId) return 0;

  const sireAncestors = getAncestorsWithDepth(sireId, hayvanlar, 0, 4);
  const damAncestors = getAncestorsWithDepth(damId, hayvanlar, 0, 4);

  const sireIds = Array.from(new Set(sireAncestors.map(a => a.id)));
  const damIds = Array.from(new Set(damAncestors.map(a => a.id)));
  const commonIds = sireIds.filter(id => damIds.includes(id));

  let f = 0;
  
  commonIds.forEach(commonId => {
    const sirePaths = sireAncestors.filter(a => a.id === commonId).map(a => a.depth);
    const damPaths = damAncestors.filter(a => a.id === commonId).map(a => a.depth);
    
    for (const n1 of sirePaths) {
      for (const n2 of damPaths) {
        if (n1 === 0 && n2 === 0) continue;
        f += Math.pow(0.5, n1 + n2 + 1);
      }
    }
  });

  return Math.min(f, 1);
};

