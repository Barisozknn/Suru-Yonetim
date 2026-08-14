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

// ─── Sağlık Skoru Yardımcı Fonksiyonları ───────────────────────────────────
//
// HSI (Health Score Index) Sistemi:
//   - Baz puan 100'den başlar.
//   - Her sağlık olayı zaman-azalmalı (decay) ceza düşürür.
//   - Muayene + hastalikAdi dolu ise hastalık teşhisi = büyük ceza.
//   - Aşı = 0 ceza (koruyucu hekimlik ödüllendirilmez ama cezalandırılmaz).
//   - Decay: e^(-0.2 × yıl) → 1 yıl önce %82, 3 yıl önce %55 etki.

const HSI_CEZA: Record<string, number> = {
  MUAYENE_HASTALIK: 15, // Muayene + hastalikAdi dolu → gerçek hastalık teşhisi
  OPERASYON:        20, // En ciddi müdahale
  ILAC:              5, // Tedavi gerekti
  MUAYENE_RUTIN:     1, // Rutin kontrol
  DIGER:             2, // Belirsiz
  ASI:               0, // Koruyucu = ceza yok
};

const SAGLIK_DECAY_K = 0.2; // yıllık decay sabiti

/** Bir hayvanın sağlık olaylarından HSI (0-100) hesaplar */
const hesaplaHSI = (records: SaglikOlayi[], bugun: Date = new Date()): number => {
  let toplamCeza = 0;
  records.forEach(r => {
    // Ceza türünü belirle
    let ceza = 0;
    if (r.tur === 'Aşı') {
      ceza = HSI_CEZA.ASI; // 0
    } else if (r.tur === 'Operasyon') {
      ceza = HSI_CEZA.OPERASYON;
    } else if (r.tur === 'İlaç') {
      ceza = HSI_CEZA.ILAC;
    } else if (r.tur === 'Muayene') {
      // Hastalık adı girilmişse gerçek hastalık teşhisi
      ceza = (r.hastalikAdi && r.hastalikAdi.trim().length > 0)
        ? HSI_CEZA.MUAYENE_HASTALIK
        : HSI_CEZA.MUAYENE_RUTIN;
    } else {
      ceza = HSI_CEZA.DIGER;
    }

    if (ceza === 0) return;

    // Zaman azalması: yeni olaylar daha fazla etkiler
    const yilGecmis = Math.max(0,
      (bugun.getTime() - new Date(r.tarih).getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
    const decayFaktor = Math.exp(-SAGLIK_DECAY_K * yilGecmis);
    toplamCeza += ceza * decayFaktor;
  });

  return Math.max(0, 100 - toplamCeza);
};

// Sağlık
export const calcHerdHealthAvg = (saglikOlaylari: SaglikOlayi[], hayvanlar: Hayvan[]): number => {
  if (hayvanlar.length === 0) return 100;
  const bugun = new Date();
  const byAnimal: Record<string, SaglikOlayi[]> = {};
  hayvanlar.forEach(h => byAnimal[h.id] = []);
  saglikOlaylari.forEach(r => { if (byAnimal[r.hayvanId] !== undefined) byAnimal[r.hayvanId].push(r); });
  const skorlar = Object.values(byAnimal).map(r => hesaplaHSI(r, bugun));
  return skorlar.reduce((a, b) => a + b, 0) / skorlar.length;
};

export const calcHerdHealthStdDev = (saglikOlaylari: SaglikOlayi[], hayvanlar: Hayvan[], avg: number): number => {
  if (hayvanlar.length < 2) return 1;
  const bugun = new Date();
  const byAnimal: Record<string, SaglikOlayi[]> = {};
  hayvanlar.forEach(h => byAnimal[h.id] = []);
  saglikOlaylari.forEach(r => { if (byAnimal[r.hayvanId] !== undefined) byAnimal[r.hayvanId].push(r); });
  const skorlar = Object.values(byAnimal).map(r => hesaplaHSI(r, bugun));
  const sumSq = skorlar.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0);
  return Math.sqrt(sumSq / (skorlar.length - 1)) || 1;
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
// Türkiye iklim koşullarına göre aylık mevsim düzeltme katsayıları.
// Yaz aylarındaki ısı stresi sütü düşürür; kış aylarında hafif artış vardır.
// Kaynak: Akkaraman/Holstein araştırmaları (Türkiye koşulları)
const SEZON_DUZELTME: Record<number, number> = {
  1: 1.04,  // Ocak   — soğuk, ısı stresi az, verim hafif yüksek
  2: 1.03,  // Şubat
  3: 1.01,  // Mart
  4: 1.00,  // Nisan  — referans ay
  5: 0.99,  // Mayıs
  6: 0.96,  // Haziran — ısı stresi başlar
  7: 0.93,  // Temmuz — pik ısı stresi
  8: 0.93,  // Ağustos — pik ısı stresi
  9: 0.97,  // Eylül
  10: 1.00, // Ekim
  11: 1.02, // Kasım
  12: 1.03, // Aralık
};

export const correctForSeason = (value: number, date: string): number => {
  const month = new Date(date).getMonth() + 1; // 1-12
  const katsayi = SEZON_DUZELTME[month] ?? 1.00;
  return value / katsayi; // Düşük aylardaki ölçümü gerçek potansiyele çevir
};

// laktasyonBiliniyorMu: doğum kaydı yoksa false — düzeltme uygulanmaz
export const correctForLactation = (milkLitre: number, lactNo: number, laktasyonBiliniyorMu: boolean = true): number => {
  if (!laktasyonBiliniyorMu) return milkLitre; // Veri yoksa olduğu gibi kullan
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
  let laktasyonBiliniyorMu = false;
  if (hayvan.tur !== 'Boğa') {
    const dogumlar = uremeKayitlari.filter(r => r.hayvanId === hayvan.id && r.tur === 'Doğum');
    if (dogumlar.length > 0) {
      laktasyonNo = dogumlar.length;
      laktasyonBiliniyorMu = true;
    }
    // Doğum kaydı yoksa laktasyon no bilinmiyor — düzeltme uygulanmaz
  }

  const byDate: Record<string, number> = {};
  records.forEach(r => {
    const d = new Date(r.tarih).toISOString().split('T')[0];
    byDate[d] = (byDate[d] || 0) + r.litre;
  });
  
  const dailyTotals = Object.values(byDate);
  const avgMilk = dailyTotals.reduce((sum, v) => sum + v, 0) / dailyTotals.length;

  // Mevsim düzeltmesi: her kaydın katkısını ağırlıklı ortalamayla düzelt
  const seasonCorrected = correctForSeason(avgMilk, records[0].tarih);
  const corrected = correctForLactation(seasonCorrected, laktasyonNo, laktasyonBiliniyorMu);

  const genetikTahmin = applyHeritability(corrected - suruOrtalamasi, H2.SUT_VERIMI);
  const zSkor = (corrected - suruOrtalamasi) / Math.max(0.1, suruStdDev);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + zSkor * 15));

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

  // Irk bazlı doğum ağırlığı referansları (kg)
  const DOGUM_AGIRLIGI: Record<string, number> = {
    'Holstein': 42, 'Simental': 46, 'Simmental': 46,
    'Jersey': 25, 'Ayrshire': 35, 'Montofon': 44,
    'Esmer': 42, 'Brown Swiss': 42, 'Angus': 35,
  };
  const dogumAgirligi = DOGUM_AGIRLIGI[hayvan.irk] ?? 38; // bilinmeyen ırk için ortalama

  let adg = 0;
  if (records.length >= 2) {
    const first = records[0];
    const last = records[records.length - 1];
    const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
    adg = ((last.kg - first.kg) / gunFarki) * 1000;
  } else if (records.length === 1 && hayvan.dogumTarihi) {
    const last = records[0];
    const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(hayvan.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
    adg = ((last.kg - dogumAgirligi) / gunFarki) * 1000; // ırka özgü doğum ağırlığı
  }

  adg = Math.max(-1500, Math.min(4000, adg));

  const genetikTahmin = applyHeritability(adg - suruOrtalamasi, H2.BUYUME_ADG);
  const zSkor = (adg - suruOrtalamasi) / Math.max(1, suruStdDev);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + zSkor * 15));

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
export const calculateHealthTDI = (hayvan: Hayvan, saglikOlaylari: SaglikOlayi[], suruOrtSaglik: number, _suruStdDevSaglik: number): SkorDetay => {
  const records = saglikOlaylari.filter(r => r.hayvanId === hayvan.id);
  const bugun = new Date();

  // HSI: 100'den başla, olaylara göre ceza düş (0-100 mutlak skor)
  const hsi = hesaplaHSI(records, bugun);

  // Sağlık skoru = HSI'nın kendisi (z-skoru değil).
  // 0 olay → 100, ağır hastalık → 20-40, rutin aşı → ~100
  // suruOrtSaglik sadece EBV/genetikTahmin için referans olarak kullanılır.
  const sapma = hsi - suruOrtSaglik;
  const genetikTahmin = applyHeritability(sapma, H2.SAGLIK);

  const toplamOnemliOlay = records.filter(r => r.tur !== 'Aşı').length;

  return {
    hamDeger: hsi,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: hsi,
    h2Katsayisi: H2.SAGLIK,
    genetikTahmin,
    normalizedSkor: hsi,  // Doğrudan HSI = sağlık skoru (0-100)
    guvenilirlik: calculateReliability(toplamOnemliOlay, H2.SAGLIK),
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

  // Tohumlama kaydı olmadan CR hesaplanamaz — nötr dön
  const tohumlamalar = records.filter(r => r.tur === 'Tohumlama/Aşım' || r.tur === 'Doğal Aşım').length;
  if (tohumlamalar === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.FERTILITE, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

  let basarili = 0;
  records.forEach(r => {
    if (r.tur === 'Doğum') basarili++;
    else if (r.tur === 'Gebelik Kontrolü' && r.durum === 'Gebe') basarili++;
  });

  const gercekBasari = Math.min(tohumlamalar, basarili);
  const cr = gercekBasari / tohumlamalar; // Artık tohumlamalar > 0 garantili

  const sapma = cr - suruOrtCR;
  const genetikTahmin = applyHeritability(sapma, H2.FERTILITE);
  // Fertilite için h²=0.05 çok küçük, z-skoru doğrudan ham CR'den alınır
  const zSkor = sapma / Math.max(0.01, suruStdDevCR);
  const normalizedSkor = Math.max(0, Math.min(100, 50 + zSkor * 15));

  return {
    hamDeger: cr,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: cr,
    h2Katsayisi: H2.FERTILITE,
    genetikTahmin,
    normalizedSkor,
    // veriSayisi = tohumlama sayısı (güvenilirlik hesabı için doğru baz)
    guvenilirlik: calculateReliability(tohumlamalar, H2.FERTILITE),
    veriSayisi: tohumlamalar
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

