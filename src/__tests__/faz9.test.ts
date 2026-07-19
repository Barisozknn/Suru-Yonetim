import { describe, it, expect } from 'vitest';
import { 
  calculateTotalAnimals, 
  calculateSpeciesDistribution, 
  calculateAverageMilkYield7Days,
  calculateEstimatedFeedCostPerLiter
} from '../utils/dashboardCalculations';

describe('Faz 9: Dashboard KPI ve Maliyet Hesaplamaları', () => {

  it('calculateTotalAnimals: Toplam hayvan sayısını doğru vermeli', () => {
    const hayvanlar: any[] = [{id: '1'}, {id: '2'}, {id: '3'}];
    expect(calculateTotalAnimals(hayvanlar)).toBe(3);
  });

  it('calculateSpeciesDistribution: Tür dağılımını doğru hesaplamalı', () => {
    const mockList = [
      {tur: 'İnek'}, {tur: 'İnek'}, {tur: 'Koyun'}
    ] as any;
    const dist = calculateSpeciesDistribution(mockList);
    expect(dist).toHaveLength(2);
    const inek = dist.find(d => d.name === 'İnek');
    expect(inek?.value).toBe(2);
  });

  it('calculateAverageMilkYield7Days: Son 7 günün süt ortalamasını almalı', () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const onDayAgo = new Date(today);
    onDayAgo.setDate(onDayAgo.getDate() - 10); // 10 gün önce (dahil olmamalı)

    const sutKayitlari: any[] = [
      { tarih: today.toISOString(), litre: 20 },
      { tarih: threeDaysAgo.toISOString(), litre: 30 },
      { tarih: onDayAgo.toISOString(), litre: 50 }, // Sayılmayacak
    ];

    const avg = calculateAverageMilkYield7Days(sutKayitlari);
    expect(avg).toBe(25); // (20 + 30) / 2
  });

  it('calculateEstimatedFeedCostPerLiter: Payda sıfır iken hata vermemeli (isValid: false dönmeli)', () => {
    const yemler: any[] = [{ birimFiyat: 10 }];
    const gruplar: any[] = [{ hayvanSayisi: 10, rasyonOzet: 'Var' }];
    const sutKayitlari: any[] = []; // Süt yok, payda 0

    const result = calculateEstimatedFeedCostPerLiter(yemler, gruplar, sutKayitlari);
    expect(result.isValid).toBe(false);
    expect(result.cost).toBe(0);
  });

  it('calculateEstimatedFeedCostPerLiter: Litre başına maliyeti hesaplamalı', () => {
    // 1 yem var, birim fiyat: 15 TL/kg
    const yemler: any[] = [{ ad: 'Arpa', birimFiyat: 15 }];
    
    // 1 grup var, 10 hayvan var. Sütçü Rasyonu. 10 kg Arpa = 150 TL/hayvan.
    // Günlük Maliyet = 150 * 10 = 1500 TL.
    const gruplar: any[] = [{ id: 'g1', hayvanSayisi: 10, rasyonAdi: 'Sütçü Rasyonu', rasyonOzet: 'Arpa: 10kg' }];
    
    // Son 7 günde toplam 700 Lt süt üretilmiş. (Günlük ortalama üretim = 100 Lt)
    // Litre Başına Maliyet = 1500 / 100 = 15 TL/Lt.
    const today = new Date();
    today.setHours(0,0,0,0);
    const sutKayitlari: any[] = [
      { tarih: today.toISOString(), litre: 700 } 
    ];

    const result = calculateEstimatedFeedCostPerLiter(yemler, gruplar, sutKayitlari);
    expect(result.isValid).toBe(true);
    expect(result.cost).toBe(15);
  });

});
