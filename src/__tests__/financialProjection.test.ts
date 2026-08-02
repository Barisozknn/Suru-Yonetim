import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculate30DayProjection } from '../utils/financialProjection';
import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';

describe('calculate30DayProjection', () => {
  beforeEach(() => {
    // Mock the current date to a fixed point for consistent testing
    const mockDate = new Date('2023-05-15T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should calculate projected revenue correctly', () => {
    const hayvanlar: Hayvan[] = [
      { id: '1', kupeNo: 'H1', tur: 'İnek', irk: 'Holstein', dogumTarihi: '2020-01-01', cinsiyet: 'Dişi', guncelAgirlikKg: 600, grupId: 'g1', durum: 'Aktif' },
      { id: '2', kupeNo: 'H2', tur: 'İnek', irk: 'Holstein', dogumTarihi: '2020-01-01', cinsiyet: 'Dişi', guncelAgirlikKg: 600, grupId: 'g1', durum: 'Aktif' }
    ];

    const sutKayitlari: SutKaydi[] = [
      // 2 cows producing 30L each per day -> 60L total per day
      { id: '1', hayvanId: '1', tarih: '2023-05-14T08:00:00.000Z', litre: 30 },
      { id: '2', hayvanId: '2', tarih: '2023-05-14T08:00:00.000Z', litre: 30 },
      { id: '3', hayvanId: '1', tarih: '2023-05-13T08:00:00.000Z', litre: 30 },
      { id: '4', hayvanId: '2', tarih: '2023-05-13T08:00:00.000Z', litre: 30 },
      { id: '5', hayvanId: '1', tarih: '2023-05-12T08:00:00.000Z', litre: 30 },
      { id: '6', hayvanId: '2', tarih: '2023-05-12T08:00:00.000Z', litre: 30 },
      // total milk in last 7 days = 180 L. Average per day = 180 / 7 = 25.714 L
    ];

    const yemler: Yem[] = [
      { id: 'y1', ad: 'Süt Yemi', tur: 'Kesif', stokKg: 1000, birimFiyat: 10, minStokUyariKg: 100 }
    ];

    const gruplar: Grup[] = [
      { id: 'g1', ad: 'Sağmallar', tur: 'İnek', rasyonOzet: 'Süt Yemi: 10kg' }
    ];

    // Health cost in last 30 days
    const saglikOlaylari: SaglikOlayi[] = [
      { id: '1', hayvanId: '1', tarih: '2023-05-01T00:00:00.000Z', tur: 'İlaç', aciklama: 'x', arinmaSuresiGun: 0, maliyet: 1500 }
    ];

    const uremeKayitlari: UremeKaydi[] = [];

    const sutFiyati = 15;

    const result = calculate30DayProjection(hayvanlar, sutKayitlari, uremeKayitlari, yemler, gruplar, saglikOlaylari, sutFiyati);
    
    // Average daily milk = 180 / 7 = 25.714
    // Base 30 day milk = 25.714 * 30 = 771.42
    // Revenue = 771.42 * 15 = 11571.42
    
    expect(result.details.totalMilkVolume).toBeCloseTo(180 / 7 * 30);
    expect(result.expectedMilkRevenue).toBeCloseTo((180 / 7 * 30) * 15);
    
    // Feed cost: 2 cows * 10kg * 10 TL = 200 TL/day. 200 * 30 = 6000
    expect(result.expectedFeedCost).toBe(6000);
    
    // Health cost: 1500
    expect(result.expectedHealthCost).toBe(1500);

    // Net profit = 11571.42 - 6000 - 1500 = 4071.42
    expect(result.netProfit).toBeCloseTo((180 / 7 * 30 * 15) - 6000 - 1500);
  });
});
