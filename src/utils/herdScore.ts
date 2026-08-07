import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';
import { calculateTotalDailyFeedCost, calculateHerdAveragePerformance } from './dashboardCalculations';

export interface HerdScoreResult {
  totalScore: number; // 0-100
  breakdown: {
    milkScore: number;
    growthScore: number;
    reproductionScore: number;
    healthScore: number;
    feedScore: number;
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
  sutFiyati: number,
  isletmeTipi: 'Süt' | 'Besi' | 'Karma' = 'Süt',
  canliKiloFiyati: number = 300
): HerdScoreResult {
  let milkScore = 0;
  let growthScore = 0;
  let reproductionScore = 0;
  let healthScore = 0;
  let feedScore = 0;
  let details: string[] = [];

  const inekler = hayvanlar.filter(h => h.tur === 'İnek' && h.durum === 'Aktif');
  const inekSayisi = inekler.length;

  if (hayvanlar.length === 0) {
    return { totalScore: 0, breakdown: { milkScore: 0, growthScore: 0, reproductionScore: 0, healthScore: 0, feedScore: 0 }, details: ['Sürüde aktif hayvan bulunmuyor.'] };
  }

  // --- ORTAK HESAPLAMALAR ---
  
  // Süt Hesaplaması (Süt ve Karma için)
  const now7 = new Date();
  const sevenDaysAgo7 = new Date(now7.getTime() - 7 * 24 * 60 * 60 * 1000);
  const son7GunSutKayitlari = sutKayitlari.filter(k => new Date(k.tarih) >= sevenDaysAgo7);
  const toplamSut7Gun = son7GunSutKayitlari.reduce((sum, k) => sum + k.litre, 0);
  const gunlukToplamSuruSutu = toplamSut7Gun / 7;
  const avgMilk = inekSayisi > 0 ? gunlukToplamSuruSutu / inekSayisi : 0;
  const targetMilk = 28;

  // Üreme Hesaplaması (Süt ve Karma için)
  const perf = calculateHerdAveragePerformance(hayvanlar, uremeKayitlari);
  let buzagilamaSkoruRaw = 0;
  let tohumlamaSkoruRaw = 0;
  if (perf.buzagilamaAraligiOrt !== null) {
    if (perf.buzagilamaAraligiOrt <= 390) buzagilamaSkoruRaw = 1;
    else if (perf.buzagilamaAraligiOrt >= 450) buzagilamaSkoruRaw = 0;
    else buzagilamaSkoruRaw = 1 - ((perf.buzagilamaAraligiOrt - 390) / 60);
  } else {
    buzagilamaSkoruRaw = 0.6; // Veri eksikse orta
  }
  if (perf.gebelikBasinaTohumlamaOrt !== null) {
    if (perf.gebelikBasinaTohumlamaOrt <= 1.8) tohumlamaSkoruRaw = 1;
    else if (perf.gebelikBasinaTohumlamaOrt >= 3.0) tohumlamaSkoruRaw = 0;
    else tohumlamaSkoruRaw = 1 - ((perf.gebelikBasinaTohumlamaOrt - 1.8) / 1.2);
  } else {
    tohumlamaSkoruRaw = 0.6; // Veri eksikse orta
  }

  // Sağlık Hesaplaması (Tümü için)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentHealthCost = saglikOlaylari
    .filter(o => new Date(o.tarih) >= thirtyDaysAgo && o.maliyet && o.maliyet > 0)
    .reduce((sum, o) => sum + (o.maliyet || 0), 0);
  const costPerAnimal = recentHealthCost / (hayvanlar.length || 1);

  // Yem Hesaplaması (Tümü için)
  const dailyFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
  const dailyMilkRevenue = gunlukToplamSuruSutu * sutFiyati;
  const expectedDailyGainTotal = hayvanlar.length * 1.2; 
  const dailyMeatRevenue = expectedDailyGainTotal * canliKiloFiyati;


  // --- İŞLETME TİPİNE GÖRE PUANLAMA (TOPLAM 100) ---
  
  if (isletmeTipi === 'Süt') {
    // SÜT (40), ÜREME (30), SAĞLIK (20), YEM (10)
    if (avgMilk >= targetMilk) milkScore = 40;
    else milkScore = (avgMilk / targetMilk) * 40;

    reproductionScore = (buzagilamaSkoruRaw * 15) + (tohumlamaSkoruRaw * 15);

    const targetHealthCost = 100;
    const maxHealthCost = 500;
    if (costPerAnimal <= targetHealthCost) healthScore = 20;
    else if (costPerAnimal >= maxHealthCost) healthScore = 0;
    else healthScore = 20 - ((costPerAnimal - targetHealthCost) / (maxHealthCost - targetHealthCost)) * 20;

    if (dailyFeedCost === 0 || dailyMilkRevenue === 0) feedScore = 5;
    else {
      const ratio = dailyMilkRevenue / dailyFeedCost;
      if (ratio >= 2.0) feedScore = 10;
      else if (ratio <= 1.0) feedScore = 0;
      else feedScore = ((ratio - 1.0) / 1.0) * 10;
    }
    
    growthScore = 0;

  } else if (isletmeTipi === 'Besi') {
    // BÜYÜME (40), SAĞLIK (30), YEM (30)
    growthScore = 30; // Şimdilik varsayılan iyi
    details.push('Büyüme performansı (ADG) varsayılan olarak değerlendirildi.');
    milkScore = 0;
    reproductionScore = 0;

    const targetHealthCost = 50;
    const maxHealthCost = 300;
    if (costPerAnimal <= targetHealthCost) healthScore = 30;
    else if (costPerAnimal >= maxHealthCost) healthScore = 0;
    else healthScore = 30 - ((costPerAnimal - targetHealthCost) / (maxHealthCost - targetHealthCost)) * 30;

    if (dailyFeedCost === 0) feedScore = 15;
    else {
      const ratio = dailyMeatRevenue / dailyFeedCost;
      if (ratio >= 1.5) feedScore = 30;
      else if (ratio <= 1.0) feedScore = 0;
      else feedScore = ((ratio - 1.0) / 0.5) * 30;
    }

  } else if (isletmeTipi === 'Karma') {
    // SÜT (20), BÜYÜME (20), ÜREME (20), SAĞLIK (20), YEM (20)
    if (avgMilk >= targetMilk) milkScore = 20;
    else milkScore = (avgMilk / targetMilk) * 20;

    growthScore = 15; // 20 üzerinden varsayılan iyi
    details.push('Büyüme performansı varsayılan olarak değerlendirildi.');

    reproductionScore = (buzagilamaSkoruRaw * 10) + (tohumlamaSkoruRaw * 10);

    const targetHealthCost = 75; // Süt ve besi ortası
    const maxHealthCost = 400;
    if (costPerAnimal <= targetHealthCost) healthScore = 20;
    else if (costPerAnimal >= maxHealthCost) healthScore = 0;
    else healthScore = 20 - ((costPerAnimal - targetHealthCost) / (maxHealthCost - targetHealthCost)) * 20;

    if (dailyFeedCost === 0) feedScore = 10;
    else {
      // Karma için toplam gelire bakılır (Süt + Et)
      const totalDailyRevenue = dailyMilkRevenue + dailyMeatRevenue;
      const ratio = totalDailyRevenue / dailyFeedCost;
      if (ratio >= 1.5) feedScore = 20;
      else if (ratio <= 1.0) feedScore = 0;
      else feedScore = ((ratio - 1.0) / 0.5) * 20;
    }
  }

  const totalScore = Math.round(milkScore + growthScore + reproductionScore + healthScore + feedScore);

  return {
    totalScore,
    breakdown: {
      milkScore: Math.round(milkScore),
      growthScore: Math.round(growthScore),
      reproductionScore: Math.round(reproductionScore),
      healthScore: Math.round(healthScore),
      feedScore: Math.round(feedScore)
    },
    details
  };
}
