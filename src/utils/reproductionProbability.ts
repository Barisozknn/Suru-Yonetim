import type { Hayvan, UremeKaydi } from '../types';

export interface ReproductionProbabilityResult {
  probability: number;
  factors: string[];
  expectedGender: {
    male: number;
    female: number;
  };
}

/**
 * Bilimsel verilere dayanarak (Parity, Service Number, Breed) gebelik başarı olasılığını hesaplar.
 * Kaynaklar: 
 * - Conception rates in dairy cattle (De Vries et al.)
 * - Effect of parity and service number on pregnancy rate.
 */
export function calculatePregnancyProbability(hayvan: Hayvan, uremeKayitlari: UremeKaydi[]): ReproductionProbabilityResult {
  let baseProbability = 45; // Temel gebelik oranı %45 (Ortalama bir sütçü sığır için temel CR)
  let factors: string[] = [];

  // Hayvanın üreme geçmişindeki tohumlamaları bul (Mevcut döngü için)
  const sonDogum = uremeKayitlari
    .filter(k => k.tur === 'Doğum')
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())[0];

  let tohumlamaSayisi = 0;
  if (sonDogum) {
    tohumlamaSayisi = uremeKayitlari.filter(k => 
      k.tur === 'Tohumlama/Aşım' && new Date(k.tarih) > new Date(sonDogum.tarih)
    ).length;
  } else {
    tohumlamaSayisi = uremeKayitlari.filter(k => k.tur === 'Tohumlama/Aşım').length;
  }

  // 1. Yaş ve Laktasyon Sayısı (Parity) Etkisi
  const laktasyonSayisi = uremeKayitlari.filter(k => k.tur === 'Doğum').length;
  
  if (laktasyonSayisi === 0) {
    // Düve (Heifer) - Conception Rate genelde %55-60 bandındadır.
    baseProbability += 15; 
    factors.push('Düve Avantajı (+%15 Olasılık)');
  } else if (laktasyonSayisi === 1) {
    factors.push('1. Laktasyon (Standart Başarı Oranı)');
  } else if (laktasyonSayisi === 2) {
    baseProbability -= 5;
    factors.push('2. Laktasyon İneği (-%5 Olasılık)');
  } else {
    baseProbability -= 10;
    factors.push('3+ Laktasyon İneği (-%10 Olasılık)');
  }

  // 2. Tohumlama Sırası Etkisi
  const siradakiTohumlama = tohumlamaSayisi + 1;
  if (siradakiTohumlama === 1) {
    baseProbability += 5;
    factors.push('1. Tohumlama (+%5 Olasılık)');
  } else if (siradakiTohumlama === 2) {
    baseProbability -= 2;
    factors.push('2. Tohumlama (-%2 Olasılık)');
  } else if (siradakiTohumlama === 3) {
    baseProbability -= 12;
    factors.push('3. Tohumlama (-%12 Olasılık)');
  } else {
    baseProbability -= 20;
    factors.push(`${siradakiTohumlama}. Tohumlama (Riskli: -%20 Olasılık)`);
  }

  // 3. Irk Etkisi
  if (hayvan.irk === 'Jersey') {
    baseProbability += 5;
    factors.push('Jersey Irkı Fertilite Avantajı (+%5)');
  } else if (hayvan.irk === 'Holstein') {
    baseProbability -= 5;
    factors.push('Holstein Yüksek Verim Baskısı (-%5)');
  } else if (['Simental', 'Montofon', 'Brown Swiss'].includes(hayvan.irk)) {
    baseProbability += 2;
    factors.push('Kombine Irk Fertilite Avantajı (+%2)');
  }

  // Sınırlandırma (Probability bounds)
  if (baseProbability > 85) baseProbability = 85;
  if (baseProbability < 10) baseProbability = 10;

  // Cinsiyet Tahmini (Konvansiyonel sperma için genel biyolojik oran)
  const expectedGender = {
    male: 51,
    female: 49
  };

  return {
    probability: baseProbability,
    factors,
    expectedGender
  };
}
