import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';
import { calculateTotalDailyFeedCost, getUpcomingBirths } from './dashboardCalculations';

export interface FinancialProjectionResult {
  expectedMilkRevenue: number;
  expectedMeatRevenue: number;
  expectedTotalRevenue: number;
  expectedFeedCost: number;
  expectedHealthCost: number;
  netProfit: number;
  details: {
    baseMilkVolume: number;
    extraMilkFromBirths: number;
    totalMilkVolume: number;
  };
}

export function calculate30DayProjection(
  hayvanlar: Hayvan[],
  sutKayitlari: SutKaydi[],
  uremeKayitlari: UremeKaydi[],
  yemler: Yem[],
  gruplar: Grup[],
  saglikOlaylari: SaglikOlayi[],
  sutFiyati: number,
  isletmeTipi: 'Süt' | 'Besi' | 'Karma' = 'Süt',
  canliKiloFiyati: number = 300
): FinancialProjectionResult {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Gelir Tahmini
  let expectedMilkRevenue = 0;
  let expectedMeatRevenue = 0;
  let expectedTotalRevenue = 0;

  let baseMilkVolume = 0;
  let extraMilkFromBirths = 0;
  let totalMilkVolume = 0;

  if (isletmeTipi === 'Süt' || isletmeTipi === 'Karma') {
    // Son 7 günün ortalama günlük toplam süt üretimini bul
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMilkRecords = sutKayitlari.filter(k => {
      const d = new Date(k.tarih);
      return d >= sevenDaysAgo && d <= now;
    });

    const totalMilk7Days = recentMilkRecords.reduce((sum, k) => sum + k.litre, 0);
    const averageDailyMilkHerd = totalMilk7Days / 7;

    const currentMonth = now.getMonth() + 1;
    let seasonalFactor = 1;

    if (currentMonth >= 6 && currentMonth <= 8) {
      seasonalFactor = 0.92;
    } else if (currentMonth >= 3 && currentMonth <= 5) {
      seasonalFactor = 1.05;
    }

    baseMilkVolume = averageDailyMilkHerd * 30 * seasonalFactor;

    const upcomingBirths = getUpcomingBirths(uremeKayitlari, hayvanlar, 30);

    upcomingBirths.forEach(birth => {
      const daysUntilBirth = Math.floor((birth.dogumTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const daysActiveInNext30Days = 30 - daysUntilBirth;
      if (daysActiveInNext30Days > 0) {
        const KOLOSTRUM_SURESI_GUN = 5;
        const SATIABILIR_GUN = Math.max(0, daysActiveInNext30Days - KOLOSTRUM_SURESI_GUN);
        const BASLANGIC_VERIMI_LT = 18;
        extraMilkFromBirths += SATIABILIR_GUN * BASLANGIC_VERIMI_LT;
      }
    });

    totalMilkVolume = baseMilkVolume + extraMilkFromBirths;
    expectedMilkRevenue = totalMilkVolume * sutFiyati;
  }
  
  if (isletmeTipi === 'Besi' || isletmeTipi === 'Karma') {
    // Etçi / Karma İşletme Gelir Tahmini
    const expectedDailyGainTotal = hayvanlar.length * 1.2; // 1.2 kg ortalama ADG varsayımı
    expectedMeatRevenue = expectedDailyGainTotal * 30 * canliKiloFiyati;
  }

  expectedTotalRevenue = expectedMilkRevenue + expectedMeatRevenue;

  // 2. Yem Gideri Tahmini
  const dailyFeedCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
  const expectedFeedCost = dailyFeedCost * 30;

  // 3. Sağlık Gideri Tahmini
  // Geçmiş 30 günün sağlık giderini bul ve önümüzdeki 30 gün için baz al
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentHealthCost = saglikOlaylari
    .filter(o => new Date(o.tarih) >= thirtyDaysAgo && o.maliyet && o.maliyet > 0)
    .reduce((sum, o) => sum + (o.maliyet || 0), 0);

  // Belki mevsimsel artış/azalış eklenebilir ama şu an geçmiş 30 günü referans alıyoruz
  const expectedHealthCost = recentHealthCost;

  // 4. Net Kar
  const netProfit = expectedTotalRevenue - expectedFeedCost - expectedHealthCost;

  return {
    expectedMilkRevenue,
    expectedMeatRevenue,
    expectedTotalRevenue,
    expectedFeedCost,
    expectedHealthCost,
    netProfit,
    details: {
      baseMilkVolume,
      extraMilkFromBirths,
      totalMilkVolume
    }
  };
}
