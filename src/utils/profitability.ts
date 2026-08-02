import type { Hayvan, SutKaydi, SaglikOlayi, UremeKaydi, Yem, Grup, HayvanGunlukYemMaliyeti } from '../types';
import { parseRasyonCost } from './dashboardCalculations';

export interface ProfitabilityResult {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  roi: number; // Yüzde olarak (Kar / Maliyet)
  details: {
    milkRevenue: number;
    calfRevenue: number;
    feedCost: number;
    healthCost: number;
    reproCost: number;
    totalMilkLt: number;
  };
}

export function calculateAnimalProfitability(
  hayvan: Hayvan,
  sutKayitlari: SutKaydi[],
  saglikOlaylari: SaglikOlayi[],
  uremeKayitlari: UremeKaydi[],
  yemler: Yem[],
  gruplar: Grup[],
  sutFiyati: number,
  buzagiFiyati: number,
  hayvanGunlukYemMaliyetleri: HayvanGunlukYemMaliyeti[] = []
): ProfitabilityResult {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // 1. Son 12 ayın Süt Geliri
  const animalMilkRecords = sutKayitlari.filter(
    k => k.hayvanId === hayvan.id && new Date(k.tarih) >= twelveMonthsAgo
  );
  const totalMilkLt = animalMilkRecords.reduce((sum, k) => sum + k.litre, 0);
  const milkRevenue = totalMilkLt * sutFiyati;

  // 2. Son 12 ayın Buzağı Geliri
  const animalBirths = uremeKayitlari.filter(
    k => k.hayvanId === hayvan.id && k.tur === 'Doğum' && new Date(k.tarih) >= twelveMonthsAgo
  );
  const calfRevenue = animalBirths.length * buzagiFiyati;

  const totalRevenue = milkRevenue + calfRevenue;

  // 3. Son 12 ayın Sağlık ve Üreme (Tohumlama vs.) Maliyetleri
  const animalHealthRecords = saglikOlaylari.filter(
    k => k.hayvanId === hayvan.id && new Date(k.tarih) >= twelveMonthsAgo
  );
  const healthCost = animalHealthRecords.reduce((sum, k) => sum + (k.maliyet || 0), 0);

  const animalReproRecords = uremeKayitlari.filter(
    k => k.hayvanId === hayvan.id && new Date(k.tarih) >= twelveMonthsAgo
  );
  const reproCost = animalReproRecords.reduce((sum, k) => sum + (k.maliyet || 0), 0);

  // 4. Son 12 Ayın Yem Maliyeti
  let feedCost = 0;

  if (hayvan.tur === 'İnek') {
    // İnekler için veritabanındaki günlük maliyet kayıtlarını topla
    const animalFeedRecords = hayvanGunlukYemMaliyetleri.filter(
      k => k.hayvanId === hayvan.id && new Date(k.tarih) >= twelveMonthsAgo
    );
    feedCost = animalFeedRecords.reduce((sum, k) => sum + (k.maliyet || 0), 0);
  } else {
    // İnek olmayanlar için (veya kayıt bulunamadıysa fallback olarak) mevcut rasyon * gün hesabı yap
    let dailyFeedCost = 0;
    if (hayvan.grupId) {
      const grup = gruplar.find(g => g.id === hayvan.grupId);
      if (grup && grup.rasyonOzet) {
        dailyFeedCost = parseRasyonCost(grup.rasyonOzet, yemler);
      }
    }

    let daysInFarm = 365;
    if (hayvan.dogumTarihi) {
      const birthDate = new Date(hayvan.dogumTarihi);
      if (birthDate > twelveMonthsAgo) {
        const diffTime = Math.abs(now.getTime() - birthDate.getTime());
        daysInFarm = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    feedCost = dailyFeedCost * daysInFarm;
  }

  const totalCost = feedCost + healthCost + reproCost;
  const netProfit = totalRevenue - totalCost;
  
  // ROI = (Kar / Toplam Maliyet) * 100
  // ROI, bu hayvana yaptığınız yatırımın ne kadarını geri kazandığınızı gösterir.
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    netProfit,
    roi,
    details: {
      milkRevenue,
      calfRevenue,
      feedCost,
      healthCost,
      reproCost,
      totalMilkLt
    }
  };
}
