import { describe, it, expect } from "vitest";
import type { Hayvan } from "../types";

export const getYavrular = (hedefHayvanKupeNo: string, tumHayvanlar: Hayvan[]): Hayvan[] => {
  return tumHayvanlar.filter(h => h.anneKupeNo === hedefHayvanKupeNo || h.babaKupeNo === hedefHayvanKupeNo);
};

export const calculateNewStock = (currentStock: number, movementKg: number, type: 'GİRİŞ' | 'ÇIKIŞ'): number => {
  if (type === 'GİRİŞ') return currentStock + movementKg;
  return currentStock - movementKg;
};

export const isLowStock = (currentStock: number, minThreshold: number): boolean => {
  return currentStock <= minThreshold;
};

describe("Faz 3: Soyağacı ve Akrabalık Testleri", () => {
  const ornekHayvanlar: Hayvan[] = [
    { id: "1", kupeNo: "TR-01", tur: "İnek", irk: "Holstein", cinsiyet: "Dişi", dogumTarihi: "", guncelAgirlikKg: 0, durum: "Aktif", grupId: null },
    { id: "2", kupeNo: "TR-02", tur: "İnek", irk: "Simental", cinsiyet: "Erkek", dogumTarihi: "", guncelAgirlikKg: 0, durum: "Aktif", grupId: null },
    { id: "3", kupeNo: "TR-03", tur: "Buzağı", irk: "Holstein", cinsiyet: "Dişi", dogumTarihi: "", guncelAgirlikKg: 0, durum: "Aktif", grupId: null, anneKupeNo: "TR-01", babaKupeNo: "TR-02" },
    { id: "4", kupeNo: "TR-04", tur: "Buzağı", irk: "Holstein", cinsiyet: "Erkek", dogumTarihi: "", guncelAgirlikKg: 0, durum: "Aktif", grupId: null, anneKupeNo: "TR-01" },
  ];

  it("Belirli bir anne/babanın tüm yavrularını geriye dönük doğru bulmalı", () => {
    const anneYavrular = getYavrular("TR-01", ornekHayvanlar);
    expect(anneYavrular.length).toBe(2);
    expect(anneYavrular.map(y => y.kupeNo)).toContain("TR-03");
    expect(anneYavrular.map(y => y.kupeNo)).toContain("TR-04");

    const babaYavrular = getYavrular("TR-02", ornekHayvanlar);
    expect(babaYavrular.length).toBe(1);
    expect(babaYavrular[0].kupeNo).toBe("TR-03");
  });
});

describe("Faz 4: Yem Stok ve Kritik Stok Uyarı Testleri", () => {
  it("Giriş yapıldığında stok doğru hesaplanmalı", () => {
    const newStock = calculateNewStock(1000, 500, 'GİRİŞ');
    expect(newStock).toBe(1500);
  });

  it("Çıkış yapıldığında stok doğru hesaplanmalı", () => {
    const newStock = calculateNewStock(1500, 300, 'ÇIKIŞ');
    expect(newStock).toBe(1200);
  });

  it("Mevcut stok minimum eşiğin altına düşünce uyarı vermeli (Kritik Stok=true)", () => {
    expect(isLowStock(400, 500)).toBe(true);
    expect(isLowStock(500, 500)).toBe(true);
    expect(isLowStock(600, 500)).toBe(false);
  });
});
