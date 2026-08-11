import { describe, it, expect } from 'vitest';
import { calculateAnimalProfitability } from '../utils/profitability';
import type { Hayvan, SutKaydi, SaglikOlayi, UremeKaydi, HayvanGunlukYemMaliyeti } from '../types';

describe('calculateAnimalProfitability', () => {
  it('should calculate revenue and costs correctly for an active cow', () => {
    const hayvan: Hayvan = {
      id: 'animal1',
      ciftlikId: 'ciftlik1',
      kupeNo: 'TR123',
      tur: 'İnek',
      irk: 'Holstein',
      dogumTarihi: '2020-01-01',
      cinsiyet: 'Dişi',
      durum: 'Aktif',
      guncelAgirlikKg: 600,
      grupId: null
    };

    const sutKayitlari: SutKaydi[] = [
      { id: '1', hayvanId: 'animal1', ciftlikId: 'ciftlik1', tarih: new Date().toISOString(), ogun: 'Sabah', litre: 15 },
      { id: '2', hayvanId: 'animal1', ciftlikId: 'ciftlik1', tarih: new Date().toISOString(), ogun: 'Akşam', litre: 15 }
    ];

    const saglikOlaylari: SaglikOlayi[] = [
      { id: '1', hayvanId: 'animal1', ciftlikId: 'ciftlik1', tarih: new Date().toISOString(), tur: 'İlaç', maliyet: 500, aciklama: 'Tedavi', arinmaSuresiGun: 0 }
    ];

    const uremeKayitlari: UremeKaydi[] = [
      { id: '1', hayvanId: 'animal1', ciftlikId: 'ciftlik1', tarih: new Date().toISOString(), tur: 'Doğum', maliyet: 200 }
    ];

    const hayvanGunlukYemMaliyetleri: HayvanGunlukYemMaliyeti[] = [
      { id: '1', ciftlikId: 'ciftlik1', hayvanId: 'animal1', tarih: new Date().toISOString(), maliyet: 100 }
    ];

    const result = calculateAnimalProfitability(
      hayvan,
      sutKayitlari,
      saglikOlaylari,
      uremeKayitlari,
      [],
      [],
      20, // Süt fiyatı
      10000, // Buzağı fiyatı
      { 'İnek': 200 }, // Canlı kilo fiyatları
      hayvanGunlukYemMaliyetleri
    );

    // Revenue: (30L * 20) = 600 Milk, 1 * 10000 = 10000 Calf, 600 * 200 = 120000 Meat -> Total 130600
    expect(result.details.milkRevenue).toBe(600);
    expect(result.details.calfRevenue).toBe(10000);
    expect(result.details.meatRevenue).toBe(120000);
    expect(result.totalRevenue).toBe(130600);

    // Costs: 123000 (Feed: 1 record + 1229 missing days * 100) + 500 (Health) + 200 (Repro) -> Total 123700
    expect(result.details.feedCost).toBe(123000);
    expect(result.details.healthCost).toBe(500);
    expect(result.details.reproCost).toBe(200);
    expect(result.totalCost).toBe(123700);

    // Net Profit: 130600 - 123700 = 6900
    expect(result.netProfit).toBe(6900);
    
    // ROI: (6900 / 123700) * 100 = 5.578%
    expect(result.roi).toBeCloseTo(5.578, 2);
  });
});
