import { describe, it, expect } from 'vitest';
import { calculatePregnancyProbability } from '../utils/reproductionProbability';
import type { Hayvan, UremeKaydi } from '../types';

describe('calculatePregnancyProbability', () => {
  it('should calculate higher probability for a heifer (Düve)', () => {
    const duve: Hayvan = {
      id: '1',
      kupeNo: 'TR1',
      tur: 'Düve',
      irk: 'Simental',
      dogumTarihi: '2023-01-01',
      cinsiyet: 'Dişi',
      guncelAgirlikKg: 400,
      grupId: null,
      durum: 'Aktif'
    };

    const result = calculatePregnancyProbability(duve, []);
    
    // Base 45 + 15 (Düve) + 5 (1. Tohumlama) + 2 (Simental) = 67
    expect(result.probability).toBe(67);
    expect(result.factors).toContain('Düve Avantajı (+%15 Olasılık)');
    expect(result.factors).toContain('1. Tohumlama (+%5 Olasılık)');
  });

  it('should decrease probability for older cows with multiple inseminations', () => {
    const inek: Hayvan = {
      id: '2',
      kupeNo: 'TR2',
      tur: 'İnek',
      irk: 'Holstein',
      dogumTarihi: '2020-01-01',
      cinsiyet: 'Dişi',
      guncelAgirlikKg: 600,
      grupId: null,
      durum: 'Aktif'
    };

    const kayitlar: UremeKaydi[] = [
      { id: '1', hayvanId: '2', tarih: '2022-01-01', tur: 'Doğum' },
      { id: '2', hayvanId: '2', tarih: '2023-01-01', tur: 'Doğum' }, // 2. Laktasyon
      { id: '3', hayvanId: '2', tarih: '2023-03-01', tur: 'Tohumlama/Aşım' },
      { id: '4', hayvanId: '2', tarih: '2023-04-01', tur: 'Tohumlama/Aşım' }
    ];

    const result = calculatePregnancyProbability(inek, kayitlar);
    
    // Base 45 - 5 (2. Laktasyon) - 12 (3. Tohumlama) - 5 (Holstein) = 23
    expect(result.probability).toBe(23);
    expect(result.factors).toContain('2. Laktasyon İneği (-%5 Olasılık)');
    expect(result.factors).toContain('3. Tohumlama (-%12 Olasılık)');
    expect(result.factors).toContain('Holstein Yüksek Verim Baskısı (-%5)');
  });

  it('should bound probability between 10 and 85', () => {
    const inek: Hayvan = {
      id: '3',
      kupeNo: 'TR3',
      tur: 'İnek',
      irk: 'Holstein',
      dogumTarihi: '2015-01-01',
      cinsiyet: 'Dişi',
      guncelAgirlikKg: 600,
      grupId: null,
      durum: 'Aktif'
    };

    // Many lactations, many inseminations -> very low prob
    const kayitlar: UremeKaydi[] = [
      { id: '1', hayvanId: '3', tarih: '2020-01-01', tur: 'Doğum' },
      { id: '2', hayvanId: '3', tarih: '2021-01-01', tur: 'Doğum' },
      { id: '3', hayvanId: '3', tarih: '2022-01-01', tur: 'Doğum' },
      { id: '4', hayvanId: '3', tarih: '2022-03-01', tur: 'Tohumlama/Aşım' },
      { id: '5', hayvanId: '3', tarih: '2022-04-01', tur: 'Tohumlama/Aşım' },
      { id: '6', hayvanId: '3', tarih: '2022-05-01', tur: 'Tohumlama/Aşım' },
      { id: '7', hayvanId: '3', tarih: '2022-06-01', tur: 'Tohumlama/Aşım' }
    ];

    const result = calculatePregnancyProbability(inek, kayitlar);
    
    // Base 45 - 10 (3+ lakt) - 20 (4+ tohumlama) - 5 (Holstein) = 10 (Lower bound)
    expect(result.probability).toBe(10);
  });
});
