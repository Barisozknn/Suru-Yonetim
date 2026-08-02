import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';
import { calculateTotalDailyFeedCost, calculateAverageMilkYield7Days, calculateHerdAveragePerformance } from './dashboardCalculations';

export interface HerdScoreResult {
  totalScore: number; // 0-100
  breakdown: {
    milkScore: number;        // Max 40
    reproductionScore: number;// Max 30
    healthScore: number;      // Max 20
    feedScore: number;        // Max 10
  };
  details: string[];
}

/**
 * Zooteknik standartlara göre SürüMetri Skorunu (0-100) hesaplar.
 */
export function calculateHerdScore(
  hayvanlar: Hayvan[],
  sutKayitlari: SutKaydi[],
  uremeKayitlari: UremeKaydi[],
  yemler: Yem[],
  gruplar: Grup[],
  saglikOlaylari: SaglikOlayi[],
  sutFiyati: number
): HerdScoreResult {
  let milkScore = 0;
  let reproductionScore = 0;
  let healthScore = 0;
  let feedScore = 0;
  let details: string[] = [];

  const inekler = hayvanlar.filter(h => h.tur === 'İnek' && h.durum === 'Aktif');
  const inekSayisi = inekler.length;

  if (inekSayisi === 0) {
    return { totalScore: 0, breakdown: { milkScore: 0, reproductionScore: 0, healthScore: 0, feedScore: 0 }, details: ['Sürüde aktif inek bulunmuyor.'] };
  }

  // 1. Süt Verimi Skoru (Max 40 Puan)
  // Hedef: İnek başı ortalama 30 Lt/Gün (Siyah Alaca ortalaması baz alınarak, esnek yapılabilir)
  const avgMilk = calculateAverageMilkYield7Days(sutKayitlari);
  const targetMilk = 28; // Türkiye şartlarında kabul edilebilir iyi bir hedef
  
  if (avgMilk >= targetMilk) {
    milkScore = 40;
    details.push('Süt verimi hedef seviyenin üzerinde (Mükemmel).');
  } else {
    milkScore = (avgMilk / targetMilk) * 40;
    details.push(`Süt verimi hedefi: ${targetMilk} Lt. Sizin ortalamanız: ${avgMilk.toFixed(1)} Lt.`);
  }

  // 2. Üreme Skoru (Max 30 Puan)
  // Alt metrikler: Buzağılama Aralığı (15 Puan) ve Gebelik Başına Tohumlama (15 Puan)
  const perf = calculateHerdAveragePerformance(hayvanlar, uremeKayitlari);
  
  let buzagilamaSkoru = 0;
  if (perf.buzagilamaAraligiOrt !== null) {
    // Hedef < 390 gün, Sınır 450 gün
    if (perf.buzagilamaAraligiOrt <= 390) buzagilamaSkoru = 15;
    else if (perf.buzagilamaAraligiOrt >= 450) buzagilamaSkoru = 0;
    else buzagilamaSkoru = 15 - ((perf.buzagilamaAraligiOrt - 390) / 60) * 15;
  } else {
    buzagilamaSkoru = 10; // Yeterli veri yoksa ortalama bir puan
    details.push('Buzağılama aralığı hesaplanamadı (veri eksik).');
  }

  let tohumlamaSkoru = 0;
  if (perf.gebelikBasinaTohumlamaOrt !== null) {
    // Hedef < 1.8, Sınır 3.0
    if (perf.gebelikBasinaTohumlamaOrt <= 1.8) tohumlamaSkoru = 15;
    else if (perf.gebelikBasinaTohumlamaOrt >= 3.0) tohumlamaSkoru = 0;
    else tohumlamaSkoru = 15 - ((perf.gebelikBasinaTohumlamaOrt - 1.8) / 1.2) * 15;
  } else {
    tohumlamaSkoru = 10;
    details.push('Tohumlama endeksi hesaplanamadı (veri eksik).');
  }

  reproductionScore = buzagilamaSkoru + tohumlamaSkoru;

  // 3. Sağlık Skoru (Max 20 Puan)
  // Hedef: Son 30 günde inek başına düşen sağlık maliyeti düşük olmalı. (Hedef < 100 TL / Hayvan / Ay)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentHealthCost = saglikOlaylari
    .filter(o => new Date(o.tarih) >= thirtyDaysAgo && o.maliyet && o.maliyet > 0)
    .reduce((sum, o) => sum + (o.maliyet || 0), 0);
  
  const costPerCow = recentHealthCost / (hayvanlar.length || 1); // Tüm hayvanlar dahil
  
  const targetHealthCost = 100;
  const maxHealthCost = 500;
  
  if (costPerCow <= targetHealthCost) {
    healthScore = 20;
  } else if (costPerCow >= maxHealthCost) {
    healthScore = 0;
    details.push('Sağlık maliyetleri kritik seviyenin üzerinde.');
  } else {
    healthScore = 20 - ((costPerCow - targetHealthCost) / (maxHealthCost - targetHealthCost)) * 20;
  }

  // 4. Yem Verimliliği Skoru (Max 10 Puan)
  // IOFC (Income Over Feed Cost) / Yemden Yararlanma Oranı
  // Hedef: Günlük süt geliri / Günlük yem maliyeti > 1.8
  const dailyFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
  const dailyMilkRevenue = avgMilk * inekSayisi * sutFiyati;
  
  if (dailyFeedCost === 0 || dailyMilkRevenue === 0) {
    feedScore = 5; // Veri yok
    details.push('Yem veya süt geliri verisi eksik olduğundan verimlilik nötr hesaplandı.');
  } else {
    const ratio = dailyMilkRevenue / dailyFeedCost;
    if (ratio >= 2.0) {
      feedScore = 10;
    } else if (ratio <= 1.0) {
      feedScore = 0; // Zarar
      details.push('DİKKAT: Günlük yem maliyeti, süt gelirine eşit veya daha yüksek (Zarar).');
    } else {
      feedScore = ((ratio - 1.0) / 1.0) * 10;
    }
  }

  const totalScore = Math.round(milkScore + reproductionScore + healthScore + feedScore);

  return {
    totalScore,
    breakdown: {
      milkScore: Math.round(milkScore),
      reproductionScore: Math.round(reproductionScore),
      healthScore: Math.round(healthScore),
      feedScore: Math.round(feedScore)
    },
    details
  };
}
