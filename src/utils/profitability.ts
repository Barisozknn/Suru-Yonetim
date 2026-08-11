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
    meatRevenue: number;
    feedCost: number;
    healthCost: number;
    reproCost: number;
    totalMilkLt: number;
    weightGainKg: number;
  };
}

export function calculateAnimalProfitability(
  hayvan: Hayvan,
  sutKayitlari: SutKaydi[],
  saglikOlaylari: SaglikOlayi[],
  uremeKayitlari: UremeKaydi[],

  yemler: Yem[],
  gruplar: Grup[],
  sutLitreFiyati: number,
  buzagiFiyati: number,
  canliKiloFiyatlari: Record<string, number>,
  hayvanGunlukYemMaliyetleri: HayvanGunlukYemMaliyeti[] = []
): ProfitabilityResult {
  const now = new Date();

  // 1. Ömür Boyu Süt Geliri
  const animalMilkRecords = sutKayitlari.filter(
    k => k.hayvanId === hayvan.id
  );
  const totalMilkLt = animalMilkRecords.reduce((sum, k) => sum + k.litre, 0);
  const milkRevenue = totalMilkLt * sutLitreFiyati;

  // 2. Ömür Boyu Buzağı Geliri
  const animalBirths = uremeKayitlari.filter(
    k => k.hayvanId === hayvan.id && k.tur === 'Doğum'
  );
  const calfRevenue = animalBirths.length * buzagiFiyati;

  // 5. Güncel Et Değeri
  const weightGainKg = hayvan.guncelAgirlikKg || 0;
  const currentTurPrice = canliKiloFiyatlari[hayvan.tur] || 300;
  const meatRevenue = weightGainKg * currentTurPrice;

  const totalRevenue = milkRevenue + calfRevenue + meatRevenue;

  // 3. Ömür Boyu Sağlık ve Üreme (Tohumlama vs.) Maliyetleri
  const animalHealthRecords = saglikOlaylari.filter(
    k => k.hayvanId === hayvan.id
  );
  const healthCost = animalHealthRecords.reduce((sum, k) => sum + (k.maliyet || 0), 0);

  const animalReproRecords = uremeKayitlari.filter(
    k => k.hayvanId === hayvan.id
  );
  const reproCost = animalReproRecords.reduce((sum, k) => sum + (k.maliyet || 0), 0);

  // 4. Ömür Boyu Yem Maliyeti
  const animalFeedRecords = hayvanGunlukYemMaliyetleri.filter(k => k.hayvanId === hayvan.id);
  const recordedFeedCost = animalFeedRecords.reduce((sum, k) => sum + (k.maliyet || 0), 0);
  const recordedDays = animalFeedRecords.length;

  let daysInFarm = 365;
  if (hayvan.dogumTarihi) {
    const birthDate = new Date(hayvan.dogumTarihi);
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    daysInFarm = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  let feedCost = recordedFeedCost;
  
  // Eksik günler için tahmini rasyon maliyeti ekle (geriye dönük veri eksikliği için)
  if (recordedDays < daysInFarm) {
    let currentDailyFeedCost = 0;
    if (hayvan.grupId) {
      const grup = gruplar.find(g => g.id === hayvan.grupId);
      if (grup && grup.rasyonOzet) {
        currentDailyFeedCost = parseRasyonCost(grup.rasyonOzet, yemler);
      }
    }
    const missingDays = daysInFarm - recordedDays;
    feedCost += missingDays * currentDailyFeedCost;
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
      meatRevenue,
      feedCost,
      healthCost,
      reproCost,
      totalMilkLt,
      weightGainKg
    }
  };
}
