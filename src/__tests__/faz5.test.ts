import { describe, it, expect } from "vitest";

// Fonksiyonları simüle ediyoruz (WeightRecords.tsx içinde olan mantık)
export const calculateADG = (kayitlar: { tarih: string; kg: number }[]): string | null => {
  if (kayitlar.length < 2) return null;
  const sorted = [...kayitlar].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  const last = sorted[0];
  const prev = sorted[1];

  const days = (new Date(last.tarih).getTime() - new Date(prev.tarih).getTime()) / (1000 * 3600 * 24);
  if (days === 0) return "0.00"; // Same day protection (sıfıra bölme)

  return ((last.kg - prev.kg) / days).toFixed(2);
};

describe("Faz 5: Ağırlık Artışı (ADG) Hesaplama ve Güvenlik", () => {
  
  it("Yeterli kayıt yoksa null döndürmeli", () => {
    expect(calculateADG([])).toBeNull();
    expect(calculateADG([{ tarih: "2026-01-01", kg: 100 }])).toBeNull();
  });

  it("ADG'yi doğru hesaplamalı (Pozitif artış)", () => {
    // 10 günde 20 kg artış -> günde 2 kg
    const kayitlar = [
      { tarih: "2026-01-01", kg: 100 },
      { tarih: "2026-01-11", kg: 120 }
    ];
    expect(calculateADG(kayitlar)).toBe("2.00");
  });

  it("ADG'yi doğru hesaplamalı (Negatif azalış)", () => {
    // 5 günde 10 kg azalış -> günde -2 kg
    const kayitlar = [
      { tarih: "2026-01-01", kg: 150 },
      { tarih: "2026-01-06", kg: 140 }
    ];
    expect(calculateADG(kayitlar)).toBe("-2.00");
  });

  it("Aynı gün içinde iki tartım girilirse sıfıra bölme hatasını engellemeli (0 dönmeli)", () => {
    const kayitlar = [
      { tarih: "2026-01-01", kg: 100 },
      { tarih: "2026-01-01", kg: 105 } // aynı gün
    ];
    expect(calculateADG(kayitlar)).toBe("0.00");
  });

});
