import { describe, it, expect } from 'vitest';
import { calculateGrowthStatus, calculateAgeInDays, calculateTargetWeaningDate } from '../utils/calfCalculations';

describe('Faz 8: Buzağı Büyütme Hesaplamaları', () => {

  it('Büyüme hedefini doğru statüde değerlendirmeli (>%90)', () => {
    // Hedef: 100kg, Güncel: 95kg => %95 => Başarılı
    const result = calculateGrowthStatus(95, 100);
    expect(result.status).toBe('Başarılı');
    expect(result.percentage).toBe(95);
  });

  it('Büyüme hedefini doğru statüde değerlendirmeli (%80-%89)', () => {
    // Hedef: 100kg, Güncel: 85kg => %85 => Riskli
    const result = calculateGrowthStatus(85, 100);
    expect(result.status).toBe('Riskli');
    expect(result.percentage).toBe(85);
  });

  it('Büyüme hedefini doğru statüde değerlendirmeli (<%80)', () => {
    // Hedef: 100kg, Güncel: 75kg => %75 => Geri Kalmış
    const result = calculateGrowthStatus(75, 100);
    expect(result.status).toBe('Geri Kalmış');
    expect(result.percentage).toBe(75);
  });

  it('Ağırlık veya hedef ağırlık yoksa Bilinmiyor dönmeli', () => {
    const result = calculateGrowthStatus(undefined, 100);
    expect(result.status).toBe('Bilinmiyor');
    
    const result2 = calculateGrowthStatus(100, 0);
    expect(result2.status).toBe('Bilinmiyor');
  });

  it('Yaşı gün olarak doğru hesaplamalı', () => {
    // Mock today to a fixed date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a birth date 10 days ago
    const birthDate = new Date(today);
    birthDate.setDate(birthDate.getDate() - 10);
    
    // YYYY-MM-DD string using local time
    const year = birthDate.getFullYear();
    const month = String(birthDate.getMonth() + 1).padStart(2, '0');
    const day = String(birthDate.getDate()).padStart(2, '0');
    const birthStr = `${year}-${month}-${day}`;
    
    const ageDays = calculateAgeInDays(birthStr);
    expect(ageDays).toBe(10);
  });

  it('Gelecek bir tarih girilirse yaşı 0 dönmeli', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 5);
    
    const ageDays = calculateAgeInDays(futureDate.toISOString().split('T')[0]);
    expect(ageDays).toBe(0);
  });

  it('Hedef sütten kesim tarihini varsayılan 60 gün olarak doğru hesaplamalı', () => {
    const targetDate = calculateTargetWeaningDate('2026-01-01');
    expect(targetDate).toBe('2026-03-02'); // 2026 is not a leap year. Jan has 31 days. 31 (Jan) + 28 (Feb) = 59 days. 60th day is Mar 2.
  });
});
