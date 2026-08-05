import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';
import { calculateTotalDailyFeedCost, calculateHerdAveragePerformance } from './dashboardCalculations';

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
  sutFiyati: number,
  isletmeTipi: 'Sütçü' | 'Etçi' = 'Sütçü',
  canliKiloFiyati: number = 300
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

  // SÜTÇÜ İŞLETME MANTIĞI
  if (isletmeTipi === 'Sütçü') {
    // 1. Süt Verimi Skoru (Max 40 Puan)
    const now7 = new Date();
    const sevenDaysAgo7 = new Date(now7.getTime() - 7 * 24 * 60 * 60 * 1000);
    const son7GunSutKayitlari = sutKayitlari.filter(k => new Date(k.tarih) >= sevenDaysAgo7);
    const toplamSut7Gun = son7GunSutKayitlari.reduce((sum, k) => sum + k.litre, 0);
    const gunlukToplamSuruSutu = toplamSut7Gun / 7;

    const avgMilk = inekSayisi > 0 ? gunlukToplamSuruSutu / inekSayisi : 0;
    const targetMilk = 28;
    
    if (avgMilk >= targetMilk) {
      milkScore = 40;
      details.push('Süt verimi hedef seviyenin üzerinde (Mükemmel).');
    } else {
      milkScore = (avgMilk / targetMilk) * 40;
      details.push(`Süt verimi hedefi: ${targetMilk} Lt. Sizin ortalamanız: ${avgMilk.toFixed(1)} Lt.`);
    }

    // 2. Üreme Skoru (Max 30 Puan)
    const perf = calculateHerdAveragePerformance(hayvanlar, uremeKayitlari);
    
    let buzagilamaSkoru = 0;
    if (perf.buzagilamaAraligiOrt !== null) {
      if (perf.buzagilamaAraligiOrt <= 390) buzagilamaSkoru = 15;
      else if (perf.buzagilamaAraligiOrt >= 450) buzagilamaSkoru = 0;
      else buzagilamaSkoru = 15 - ((perf.buzagilamaAraligiOrt - 390) / 60) * 15;
    } else {
      buzagilamaSkoru = 10;
      details.push('Buzağılama aralığı hesaplanamadı (veri eksik).');
    }

    let tohumlamaSkoru = 0;
    if (perf.gebelikBasinaTohumlamaOrt !== null) {
      if (perf.gebelikBasinaTohumlamaOrt <= 1.8) tohumlamaSkoru = 15;
      else if (perf.gebelikBasinaTohumlamaOrt >= 3.0) tohumlamaSkoru = 0;
      else tohumlamaSkoru = 15 - ((perf.gebelikBasinaTohumlamaOrt - 1.8) / 1.2) * 15;
    } else {
      tohumlamaSkoru = 10;
      details.push('Tohumlama endeksi hesaplanamadı (veri eksik).');
    }
    reproductionScore = buzagilamaSkoru + tohumlamaSkoru;

    // 3. Sağlık Skoru (Max 20 Puan)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentHealthCost = saglikOlaylari
      .filter(o => new Date(o.tarih) >= thirtyDaysAgo && o.maliyet && o.maliyet > 0)
      .reduce((sum, o) => sum + (o.maliyet || 0), 0);
    const costPerCow = recentHealthCost / (hayvanlar.length || 1);
    
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
    const dailyFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
    const dailyMilkRevenue = gunlukToplamSuruSutu * sutFiyati;
    
    if (dailyFeedCost === 0 || dailyMilkRevenue === 0) {
      feedScore = 5;
      details.push('Yem veya süt geliri verisi eksik olduğundan verimlilik nötr hesaplandı.');
    } else {
      const ratio = dailyMilkRevenue / dailyFeedCost;
      if (ratio >= 2.0) {
        feedScore = 10;
      } else if (ratio <= 1.0) {
        feedScore = 0;
        details.push('DİKKAT: Günlük yem maliyeti, süt gelirine eşit veya daha yüksek (Zarar).');
      } else {
        feedScore = ((ratio - 1.0) / 1.0) * 10;
      }
    }
  } 
  // ETÇİ İŞLETME MANTIĞI
  else {
    // 1. ADG / Büyüme Skoru (Max 40 Puan)
    milkScore = 30; // Şimdilik varsayılan iyi bir skor. (Gerçek ADG hesabı ağırlık kayıtlarından yapılabilir)
    details.push('Büyüme performansı (ADG) varsayılan olarak değerlendirildi (Tartım verisi gerekli).');

    // 2. Üreme Skoru (Max 0 Puan)
    reproductionScore = 0;

    // 3. Sağlık Skoru (Max 30 Puan)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentHealthCost = saglikOlaylari
      .filter(o => new Date(o.tarih) >= thirtyDaysAgo && o.maliyet && o.maliyet > 0)
      .reduce((sum, o) => sum + (o.maliyet || 0), 0);
    const costPerAnimal = recentHealthCost / (hayvanlar.length || 1);
    
    const targetHealthCost = 50; // Etçi işletmelerde daha düşük sağlık maliyeti beklenir
    const maxHealthCost = 300;
    
    if (costPerAnimal <= targetHealthCost) {
      healthScore = 30;
    } else if (costPerAnimal >= maxHealthCost) {
      healthScore = 0;
      details.push('Sağlık maliyetleri kritik seviyenin üzerinde.');
    } else {
      healthScore = 30 - ((costPerAnimal - targetHealthCost) / (maxHealthCost - targetHealthCost)) * 30;
    }

    // 4. Yem Verimliliği (Max 30 Puan)
    const dailyFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
    // Ortalama günlük canlı ağırlık artışı tahmini (örn: hayvan başı 1.2 kg)
    const expectedDailyGainTotal = hayvanlar.length * 1.2; 
    const dailyMeatRevenue = expectedDailyGainTotal * canliKiloFiyati;

    if (dailyFeedCost === 0) {
      feedScore = 15;
      details.push('Yem maliyeti girilmediği için FCR verimliliği nötr hesaplandı.');
    } else {
      const ratio = dailyMeatRevenue / dailyFeedCost;
      // Hedef: 1 TL yeme karşılık 1.5 TL et değeri
      if (ratio >= 1.5) {
        feedScore = 30;
      } else if (ratio <= 1.0) {
        feedScore = 0;
        details.push('DİKKAT: Günlük yem maliyeti, kazanılan et değerinden yüksek (Zarar).');
      } else {
        feedScore = ((ratio - 1.0) / 0.5) * 30;
      }
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
