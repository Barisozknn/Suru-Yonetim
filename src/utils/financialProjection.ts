import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';
import { calculateTotalDailyFeedCost, getUpcomingBirths } from './dashboardCalculations';

export interface FinancialProjectionResult {
  expectedMilkRevenue: number;
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
  sutFiyati: number
): FinancialProjectionResult {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Süt Geliri Tahmini
  // Son 7 günün ortalama günlük toplam süt üretimini bul
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentMilkRecords = sutKayitlari.filter(k => {
    const d = new Date(k.tarih);
    return d >= sevenDaysAgo && d <= now;
  });

  const totalMilk7Days = recentMilkRecords.reduce((sum, k) => sum + k.litre, 0);
  const averageDailyMilkHerd = totalMilk7Days / 7;

  // Sezonsal Faktör Hesaplama (Kuzey Yarımküre varsayımı)
  // Yaz aylarında (Haziran, Temmuz, Ağustos) sıcaklık stresinden dolayı ~%8 süt düşüşü öngörülür.
  // İlkbahar aylarında (Mart, Nisan, Mayıs) taze ot ve ideal hava nedeniyle ~%5 artış öngörülür.
  const currentMonth = now.getMonth() + 1; // 1-12
  let seasonalFactor = 1; // %100

  if (currentMonth >= 6 && currentMonth <= 8) {
    seasonalFactor = 0.92; // %8 düşüş
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    seasonalFactor = 1.05; // %5 artış
  }

  // Temel 30 günlük süt hacmi (Mevcut verim * sezonsal faktör)
  let baseMilkVolume = averageDailyMilkHerd * 30 * seasonalFactor;

  // Gelecek 30 gün içinde beklenen doğumlardan gelecek ekstra süt (Varsayım: Doğumdan sonra günde 25 Lt süt)
  const upcomingBirths = getUpcomingBirths(uremeKayitlari, hayvanlar, 30);
  let extraMilkFromBirths = 0;

  upcomingBirths.forEach(birth => {
    const daysActiveInNext30Days = 30 - Math.floor((birth.dogumTarihi.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysActiveInNext30Days > 0) {
      extraMilkFromBirths += (daysActiveInNext30Days * 25); // Varsayılan 25 Lt/gün laktasyon başlangıcı
    }
  });

  const totalMilkVolume = baseMilkVolume + extraMilkFromBirths;
  const expectedMilkRevenue = totalMilkVolume * sutFiyati;

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
  const netProfit = expectedMilkRevenue - expectedFeedCost - expectedHealthCost;

  return {
    expectedMilkRevenue,
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
