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

// Irk bazlı doğum ağırlığı referansları — hem sürü ortalaması hem bireysel skorla tutarlı olsun
const DOGUM_AGIRLIGI_REF: Record<string, number> = {
  'Holstein': 42, 'Simental': 46, 'Simmental': 46,
  'Jersey': 25, 'Ayrshire': 35, 'Montofon': 44,
  'Esmer': 42, 'Brown Swiss': 42, 'Angus': 35,
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
    const hayvan = hayvanlar.find(h => h.id === hayvanId);
    if (records.length >= 2) {
      const first = records[0];
      const last = records[records.length - 1];
      const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
      adg = ((last.kg - first.kg) / gunFarki) * 1000;
    } else if (records.length === 1 && hayvan && hayvan.dogumTarihi) {
      // DÜZ. 4: Sabit 40 kg yerine ırk bazlı referans (bireysel skorla tutarlı)
      const refAgirlik = DOGUM_AGIRLIGI_REF[hayvan.irk] ?? 38;
      const gunFarki = Math.max(1, (new Date(records[0].tarih).getTime() - new Date(hayvan.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
      adg = ((records[0].kg - refAgirlik) / gunFarki) * 1000;
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
    const hayvan = hayvanlar.find(h => h.id === hayvanId);
    if (records.length >= 2) {
      const first = records[0];
      const last = records[records.length - 1];
      const gunFarki = Math.max(1, (new Date(last.tarih).getTime() - new Date(first.tarih).getTime()) / (1000 * 60 * 60 * 24));
      adg = ((last.kg - first.kg) / gunFarki) * 1000;
    } else if (records.length === 1 && hayvan && hayvan.dogumTarihi) {
      // DÜZ. 4: Sabit 40 kg yerine ırk bazlı referans
      const refAgirlik = DOGUM_AGIRLIGI_REF[hayvan.irk] ?? 38;
      const gunFarki = Math.max(1, (new Date(records[0].tarih).getTime() - new Date(hayvan.dogumTarihi).getTime()) / (1000 * 60 * 60 * 24));
      adg = ((records[0].kg - refAgirlik) / gunFarki) * 1000;
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

// ─── Fertilite Yardımcı: Tohumlama bazlı CR (çift sayım önlendi) ────────────
// DÜZ. 3: Her tohumlama için en yakın sonuç olayına bakılır.
// Aynı gebelik için hem GK-Gebe hem Doğum kaydı varsa yalnızca biri sayılır.
const calcCRFromRecords = (records: UremeKaydi[]): { cr: number; tohumlamaSayisi: number } => {
  const tohumlamalar = records
    .filter(r => r.tur === 'Tohumlama/Aşım' || r.tur === 'Doğal Aşım')
    .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

  if (tohumlamalar.length === 0) return { cr: 0, tohumlamaSayisi: 0 };

  let basarili = 0;
  tohumlamalar.forEach(tohum => {
    const tohTarih = new Date(tohum.tarih).getTime();
    // Bu tohumlamadan sonra gelen kayıtları al, tarihe göre sırala
    const sonrakiOlaylar = records
      .filter(r => new Date(r.tarih).getTime() > tohTarih)
      .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

    const ilkSonuc = sonrakiOlaylar.find(r =>
      r.tur === 'Doğum' ||
      (r.tur === 'Gebelik Kontrolü' && (r.durum === 'Gebe' || r.durum === 'Gebe Değil')) ||
      r.tur === 'Tohumlama/Aşım' ||
      r.tur === 'Doğal Aşım' ||
      r.tur === 'Kızgınlık'
    );

    if (!ilkSonuc) return; // Henüz sonuç yok — değerlendirme dışı
    if (ilkSonuc.tur === 'Doğum') { basarili++; return; }
    if (ilkSonuc.tur === 'Gebelik Kontrolü' && ilkSonuc.durum === 'Gebe') { basarili++; return; }
    // Sonuç: Gebe Değil, yeni tohumlama veya kızgınlık → başarısız
  });

  return { cr: basarili / tohumlamalar.length, tohumlamaSayisi: tohumlamalar.length };
};

// Fertilite (CR)
export const calcHerdFertilityAvg = (uremeKayitlari: UremeKaydi[]): number => {
  // Sürü düzeyinde CR: tüm hayvanların toplam tohumlama/başarı oranı
  const { cr, tohumlamaSayisi } = calcCRFromRecords(uremeKayitlari);
  if (tohumlamaSayisi === 0) return 0;
  return cr;
};

export const calcHerdFertilityStdDev = (uremeKayitlari: UremeKaydi[], hayvanlar: Hayvan[], avg: number): number => {
  if (hayvanlar.length < 2) return 0.1;

  const crs: number[] = [];
  hayvanlar.forEach(h => {
    const hRecords = uremeKayitlari.filter(r => r.hayvanId === h.id);
    const { cr, tohumlamaSayisi } = calcCRFromRecords(hRecords);
    if (tohumlamaSayisi > 0) crs.push(cr);
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
// DÜZ. 5: Laktasyon düzeltme katsayıları ICAR/NMC referanslarına göre güncellendi.
// 4. laktasyon pik verim dönemi → referans (1.00).
// 1–3. laktasyon için artış, 5+ için küçük yaşlı-inek düzeltmesi.
export const correctForLactation = (milkLitre: number, lactNo: number, laktasyonBiliniyorMu: boolean = true): number => {
  if (!laktasyonBiliniyorMu) return milkLitre; // Veri yoksa olduğu gibi kullan
  let corrected = milkLitre;
  if (lactNo === 1) corrected *= 1.25;       // 1. laktasyon: belirgin düşük verim
  else if (lactNo === 2) corrected *= 1.12;  // 2. laktasyon: orta düzey
  else if (lactNo === 3) corrected *= 1.05;  // 3. laktasyon: pik yakın
  else if (lactNo === 4) corrected *= 1.00;  // 4. laktasyon: referans (pik)
  else corrected *= 1.03;                    // 5+: yaşlı inek, hafif yukarı düzeltme
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

  // DÜZ. 2: Her günlük toplam kendi tarihiyle mevsim düzeltmesine tabi tutulur,
  // ardından düzeltilmiş değerlerin ortalaması alınır.
  const byDate: Record<string, { toplam: number; tarih: string }> = {};
  records.forEach(r => {
    const d = new Date(r.tarih).toISOString().split('T')[0];
    if (!byDate[d]) byDate[d] = { toplam: 0, tarih: d };
    byDate[d].toplam += r.litre;
  });

  const hamDailyTotals = Object.values(byDate).map(v => v.toplam);
  const avgMilk = hamDailyTotals.reduce((sum, v) => sum + v, 0) / hamDailyTotals.length;

  // Her günü kendi tarihiyle düzelt → mevsim ortalaması doğru hesaplanır
  const correctedDailyTotals = Object.values(byDate).map(v => correctForSeason(v.toplam, v.tarih));
  const seasonCorrected = correctedDailyTotals.reduce((sum, v) => sum + v, 0) / correctedDailyTotals.length;
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

  // DÜZ. 4: Merkezi DOGUM_AGIRLIGI_REF sabiti kullanılıyor — sürü ortalamasıyla tutarlı
  const dogumAgirligi = DOGUM_AGIRLIGI_REF[hayvan.irk] ?? 38; // bilinmeyen ırk için ortalama

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
// DÜZ. 1: HSI (100'den başlayıp hastalık/operasyonla azalan sistem) KORUNUYOR.
// Değişen tek şey: HSI değeri artık sürü HSI ortalamasına göre z-skoru ile
// normalize ediliyor (diğer metriklerle tutarlı — 50 = sürü ortalaması).
export const calculateHealthTDI = (hayvan: Hayvan, saglikOlaylari: SaglikOlayi[], suruOrtSaglik: number, suruStdDevSaglik: number): SkorDetay => {
  const records = saglikOlaylari.filter(r => r.hayvanId === hayvan.id);
  const bugun = new Date();

  // HSI: 100'den başla, olaylara göre ceza düş (0-100 mutlak skor)
  // Bu hesaplama değişmedi — tasarım doğru.
  const hsi = hesaplaHSI(records, bugun);

  const sapma = hsi - suruOrtSaglik;
  const genetikTahmin = applyHeritability(sapma, H2.SAGLIK);

  // Z-skoru normalizasyonu: diğer metriklerle aynı ölçekte (50 = sürü ortalaması)
  // StdDev çok küçükse (tüm hayvanlar benzer sağlıkta) fallback olarak HSI kullan
  let normalizedSkor: number;
  if (suruStdDevSaglik < 0.5) {
    // Sürüdeki tüm hayvanlar neredeyse aynı HSI'ya sahipse → hepsinin skoru ~50
    normalizedSkor = 50 + (sapma > 0 ? 1 : sapma < 0 ? -1 : 0) * Math.min(5, Math.abs(sapma));
  } else {
    const zSkor = sapma / suruStdDevSaglik;
    normalizedSkor = Math.max(0, Math.min(100, 50 + zSkor * 15));
  }

  const toplamOnemliOlay = records.filter(r => r.tur !== 'Aşı').length;

  return {
    hamDeger: hsi,
    cevreselDuzeltme: 0,
    duzeltilmisDeger: hsi,
    h2Katsayisi: H2.SAGLIK,
    genetikTahmin,
    normalizedSkor,
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

  // DÜZ. 3: Tohumlama bazlı CR (çift sayım önlendi)
  const { cr, tohumlamaSayisi } = calcCRFromRecords(records);
  if (tohumlamaSayisi === 0) {
    return { hamDeger: 0, cevreselDuzeltme: 0, duzeltilmisDeger: 0, h2Katsayisi: H2.FERTILITE, genetikTahmin: 0, normalizedSkor: 50, guvenilirlik: 0, veriSayisi: 0 };
  }

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
    guvenilirlik: calculateReliability(tohumlamaSayisi, H2.FERTILITE),
    veriSayisi: tohumlamaSayisi
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
    // DÜZ. 6: Besi işletmelerinde büyüme baskın, üreme önemsiz
    wSut = 0.00; wBuyume = 0.75; wSaglik = 0.20; wUreme = 0.05;
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

