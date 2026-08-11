import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateHerdScore } from '../utils/herdScore';
import type { Hayvan, SutKaydi, UremeKaydi, Yem, Grup, SaglikOlayi } from '../types';

describe('calculateHerdScore', () => {
  beforeEach(() => {
    const mockDate = new Date('2023-05-15T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 for empty herd', () => {
    const result = calculateHerdScore([], [], [], [], [], [], [], 15);
    expect(result.totalScore).toBe(0);
  });

  it('should calculate score properly for an ideal herd', () => {
    const hayvanlar: Hayvan[] = [
      { id: '1', kupeNo: 'H1', tur: 'İnek', irk: 'Holstein', dogumTarihi: '2020-01-01', cinsiyet: 'Dişi', guncelAgirlikKg: 600, grupId: 'g1', durum: 'Aktif' },
    ];

    const sutKayitlari: SutKaydi[] = [
      // 30 Lt average => > 28 Lt target => milk score 40
      { id: '1', hayvanId: '1', tarih: '2023-05-14T08:00:00.000Z', litre: 30 },
      { id: '3', hayvanId: '1', tarih: '2023-05-13T08:00:00.000Z', litre: 30 },
    ];

    const uremeKayitlari: UremeKaydi[] = [
      // calving interval and tohumlama (Ideal: buzagilama araligi < 390 -> 15pt. tohumlama < 1.8 -> 15pt)
      { id: 'u1', hayvanId: '1', tarih: '2022-01-01T00:00:00.000Z', tur: 'Doğum' },
      { id: 'u2', hayvanId: '1', tarih: '2022-03-01T00:00:00.000Z', tur: 'Tohumlama/Aşım' },
      { id: 'u3', hayvanId: '1', tarih: '2022-04-01T00:00:00.000Z', tur: 'Gebelik Kontrolü', durum: 'Gebe' },
      { id: 'u4', hayvanId: '1', tarih: '2023-01-01T00:00:00.000Z', tur: 'Doğum' },
      // Calving interval = 365 days (<= 390) => 15 pts
      // Services per conception = 1 (<= 1.8) => 15 pts
      // Total Repro = 30
    ];

    const yemler: Yem[] = [
      { id: 'y1', ad: 'Yem', tur: 'Kesif', stokKg: 1000, birimFiyat: 10, minStokUyariKg: 100 }
    ];

    const gruplar: Grup[] = [
      { id: 'g1', ad: 'Sağmallar', tur: 'İnek', rasyonOzet: 'Yem: 10kg' }
    ]; // Feed cost = 100 TL / day. Milk rev = 30 * 15 = 450 TL/day. Ratio = 4.5 (> 2.0) => feed score 10

    const saglikOlaylari: SaglikOlayi[] = [
      // 50 TL in last 30 days => < 100 TL target => health score 20
      { id: 's1', hayvanId: '1', tarih: '2023-05-01T00:00:00.000Z', tur: 'İlaç', aciklama: 'Vitamin', arinmaSuresiGun: 0, maliyet: 50 }
    ];

    const sutFiyati = 15;

    const result = calculateHerdScore(hayvanlar, sutKayitlari, uremeKayitlari, yemler, gruplar, saglikOlaylari, [], sutFiyati);
    
    expect(result.breakdown.milkScore).toBe(40);
    expect(result.breakdown.reproductionScore).toBe(30);
    expect(result.breakdown.healthScore).toBe(20);
    expect(result.breakdown.feedScore).toBe(10);
    expect(result.totalScore).toBe(100);
  });
});
