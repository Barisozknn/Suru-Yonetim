import { describe, it, expect } from 'vitest';

// Arınma süresi kalan gün hesaplama
const hesaplaArinmaKalanGun = (islemTarihi: string, arinmaSuresiGun: number): number => {
  if (!arinmaSuresiGun || arinmaSuresiGun <= 0) return 0;
  const bitis = new Date(islemTarihi);
  bitis.setDate(bitis.getDate() + arinmaSuresiGun);
  bitis.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((bitis.getTime() - today.getTime()) / 86400000));
};

// Protokolden planlanan aşı tarihi hesaplama
const hesaplaPlanlananAsiTarihi = (dogumTarihi: string, gunFarki: number): string => {
  const tarih = new Date(dogumTarihi);
  tarih.setDate(tarih.getDate() + gunFarki);
  return tarih.toISOString().split('T')[0];
};

describe('Faz 6: Arınma Süresi Geri Sayım Hesaplama', () => {

  it('0 arınma günü — her zaman 0 döndürmeli', () => {
    expect(hesaplaArinmaKalanGun('2026-01-01', 0)).toBe(0);
  });

  it('Gelecekteki arınma — pozitif gün sayısı döndürmeli', () => {
    // 99 gün sonra bitiyor, kalan kesinlikle pozitif olmalı
    const gelecek = new Date();
    gelecek.setDate(gelecek.getDate() - 1); // dün ilaç uygulandı
    const tarih = gelecek.toISOString().split('T')[0];
    const kalan = hesaplaArinmaKalanGun(tarih, 100);
    expect(kalan).toBeGreaterThan(0);
  });

  it('Geçmişteki arınma — sıfır döndürmeli (negatif olmaz)', () => {
    // 2 yıl önceki arınma, 10 günlük
    expect(hesaplaArinmaKalanGun('2024-01-01', 10)).toBe(0);
  });

  it('Bugün biten arınma — 0 döndürmeli', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Bugün biten: arinmaSuresiGun gün önce uygulandıysa bitiş = bugün
    const baslangic = new Date(today);
    baslangic.setDate(baslangic.getDate() - 7);
    const tarih = baslangic.toISOString().split('T')[0];
    expect(hesaplaArinmaKalanGun(tarih, 7)).toBe(0);
  });
});

describe('Faz 6: Protokolden Planlanan Aşı Tarihi Hesaplama', () => {

  it('Doğum günü + X gün doğru hesaplanmalı', () => {
    // 45. gün aşısı
    expect(hesaplaPlanlananAsiTarihi('2026-01-01', 45)).toBe('2026-02-15');
  });

  it('Yıl atlayan hesaplama doğru çalışmalı (Aralık → Ocak)', () => {
    // 20 gün sonrası Ocak'a taşmalı
    expect(hesaplaPlanlananAsiTarihi('2025-12-20', 20)).toBe('2026-01-09');
  });

  it('Şubat/artık yıl durumunu doğru yönetmeli', () => {
    // 2024 artık yıl, 28 Şubat + 10 gün = 9 Mart
    expect(hesaplaPlanlananAsiTarihi('2024-02-28', 10)).toBe('2024-03-09');
  });

  it('0 gün farkı — doğum günü kendisi olmalı', () => {
    expect(hesaplaPlanlananAsiTarihi('2026-06-15', 0)).toBe('2026-06-15');
  });
});
