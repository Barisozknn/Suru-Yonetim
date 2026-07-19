import { describe, it, expect } from 'vitest';

const ORTALAMA_GEBELIK_SURESI_GUN = 283;
const ORTALAMA_KIZGINLIK_DONGUSU_GUN = 21;
const KURUYA_CIKARMA_SURESI_GUN = 60;
const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

describe('Faz 7: Üreme Yönetimi Hesaplamaları', () => {

  it('Beklenen sonraki kızgınlık tarihini doğru hesaplamalı', () => {
    // 1 Ocak + 21 gün = 22 Ocak
    expect(addDays('2026-01-01', ORTALAMA_KIZGINLIK_DONGUSU_GUN)).toBe('2026-01-22');
  });

  it('Tahmini doğum tarihini doğru hesaplamalı', () => {
    // 1 Ocak + 283 gün = 11 Ekim
    expect(addDays('2026-01-01', ORTALAMA_GEBELIK_SURESI_GUN)).toBe('2026-10-11');
  });

  it('Önerilen kuruya çıkarma tarihini doğru hesaplamalı', () => {
    // Doğum: 11 Ekim, Kuruya Çıkarma (60 gün önce) = 12 Ağustos
    expect(addDays('2026-10-11', -KURUYA_CIKARMA_SURESI_GUN)).toBe('2026-08-12');
  });

  it('Yıl atlama durumunda doğru hesaplamalı (Doğum tarihi)', () => {
    // Tohumlama: 15 Aralık 2025 + 283 gün = 24 Eylül 2026
    expect(addDays('2025-12-15', ORTALAMA_GEBELIK_SURESI_GUN)).toBe('2026-09-24');
  });

  it('Yıl atlama durumunda doğru hesaplamalı (Kızgınlık)', () => {
    // Kızgınlık: 20 Aralık 2025 + 21 gün = 10 Ocak 2026
    expect(addDays('2025-12-20', ORTALAMA_KIZGINLIK_DONGUSU_GUN)).toBe('2026-01-10');
  });

  it('Artık yıl şubat geçişini doğru hesaplamalı (2024)', () => {
    // Tohumlama: 10 Şubat 2024 (Artık yıl)
    // 10 Şubat 2024 + 283 gün = 19 Kasım 2024
    expect(addDays('2024-02-10', ORTALAMA_GEBELIK_SURESI_GUN)).toBe('2024-11-19');
  });
  
  it('Artık olmayan yıl şubat geçişini doğru hesaplamalı (2025)', () => {
    // Tohumlama: 10 Şubat 2025
    // 10 Şubat 2025 + 283 gün = 20 Kasım 2025
    expect(addDays('2025-02-10', ORTALAMA_GEBELIK_SURESI_GUN)).toBe('2025-11-20');
  });

});
