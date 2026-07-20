import type { Hayvan, UremeKaydi, BuzagiKaydi, AgirlikKaydi } from '../types';

export const formatDaysToText = (days: number | null): string => {
  if (days === null || days < 0) return '-';
  if (days === 0) return '0 Gün';
  
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) {
      return `${months} Ay`;
    }
    return `${months} Ay ${remainingDays} Gün`;
  }
  return `${days} Gün`;
};

const getDiffDays = (date1: string | Date, date2: string | Date): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateFemalePerformance = (
  hayvan: Hayvan,
  uremeKayitlari: UremeKaydi[]
) => {
  const sortedRecords = [...uremeKayitlari].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );

  const dogumlar = sortedRecords.filter((r) => r.tur === 'Doğum');
  const tohumlamalar = sortedRecords.filter((r) => r.tur === 'Tohumlama/Aşım');
  const gebelikler = sortedRecords.filter((r) => r.tur === 'Gebelik Kontrolü' && r.durum === 'Gebe');
  const kurular = sortedRecords.filter((r) => r.tur === 'Kuruya Çıkarma');

  // Güncel Laktasyon süresi
  let laktasyonSuresiGun: number | null = null;
  if (dogumlar.length > 0) {
    const sonDogum = dogumlar[dogumlar.length - 1];
    const sonDogumTarihi = new Date(sonDogum.tarih);
    
    // Doğumdan sonraki kuru kaydını bul
    const sonrakiKuru = kurular.find(
      (k) => new Date(k.tarih).getTime() > sonDogumTarihi.getTime()
    );

    if (sonrakiKuru) {
      laktasyonSuresiGun = getDiffDays(sonDogum.tarih, sonrakiKuru.tarih);
    } else {
      laktasyonSuresiGun = getDiffDays(sonDogum.tarih, new Date());
    }
  }

  // İlk tohumlama yaşı
  let ilkTohumlamaYasiGun: number | null = null;
  if (tohumlamalar.length > 0) {
    ilkTohumlamaYasiGun = getDiffDays(hayvan.dogumTarihi, tohumlamalar[0].tarih);
  }

  // İlk gebelik yaşı
  let ilkGebelikYasiGun: number | null = null;
  if (gebelikler.length > 0) {
    const ilkGebelik = gebelikler[0];
    const oncesiTohumlama = [...tohumlamalar]
      .reverse()
      .find((t) => new Date(t.tarih).getTime() <= new Date(ilkGebelik.tarih).getTime());
    
    if (oncesiTohumlama) {
      ilkGebelikYasiGun = getDiffDays(hayvan.dogumTarihi, oncesiTohumlama.tarih);
    } else {
       ilkGebelikYasiGun = getDiffDays(hayvan.dogumTarihi, ilkGebelik.tarih); 
    }
  } else if (dogumlar.length > 0) {
    ilkGebelikYasiGun = Math.max(0, getDiffDays(hayvan.dogumTarihi, dogumlar[0].tarih) - 280);
  }

  // İlkine buzağılama yaşı
  let ilkBuzagilamaYasiGun: number | null = null;
  if (dogumlar.length > 0) {
    ilkBuzagilamaYasiGun = getDiffDays(hayvan.dogumTarihi, dogumlar[0].tarih);
  }

  // İki buzağılama arası geçen süre (ortalama)
  let buzagilamaArasiSureGun: number | null = null;
  if (dogumlar.length > 1) {
    let totalDays = 0;
    for (let i = 1; i < dogumlar.length; i++) {
      totalDays += getDiffDays(dogumlar[i - 1].tarih, dogumlar[i].tarih);
    }
    buzagilamaArasiSureGun = Math.floor(totalDays / (dogumlar.length - 1));
  }

  // Servis periyodu (Doğum - Sonraki başarılı tohumlama arası ortalama gün)
  let servisPeriyoduGun: number | null = null;
  if (dogumlar.length > 0 && gebelikler.length > 0) {
    let totalServis = 0;
    let servisCount = 0;
    
    dogumlar.forEach((dogum) => {
      const sonrakiGebelik = gebelikler.find((g) => new Date(g.tarih).getTime() > new Date(dogum.tarih).getTime());
      if (sonrakiGebelik) {
        const tohumlama = [...tohumlamalar].reverse().find((t) => 
          new Date(t.tarih).getTime() <= new Date(sonrakiGebelik.tarih).getTime() &&
          new Date(t.tarih).getTime() >= new Date(dogum.tarih).getTime()
        );
        if (tohumlama) {
          totalServis += getDiffDays(dogum.tarih, tohumlama.tarih);
          servisCount++;
        }
      }
    });
    
    if (servisCount > 0) {
      servisPeriyoduGun = Math.floor(totalServis / servisCount);
    }
  }

  // Gebelik başına tohumlama sayısı
  let gebelikBasinaTohumlama: number | null = null;
  const basariliGebelikSayisi = Math.max(gebelikler.length, dogumlar.length);
  if (basariliGebelikSayisi > 0 && tohumlamalar.length > 0) {
    gebelikBasinaTohumlama = Number((tohumlamalar.length / basariliGebelikSayisi).toFixed(1));
  }

  // Laktasyon sayısı
  const laktasyonSayisi = dogumlar.length;

  // Ortalama Laktasyon süresi
  let ortalamaLaktasyonSuresiGun: number | null = null;
  let totalLaktasyon = 0;
  let completedLaktasyonCount = 0;

  dogumlar.forEach((dogum) => {
    const dogumTarihi = new Date(dogum.tarih);
    const sonrakiKuru = kurular.find(
      (k) => new Date(k.tarih).getTime() > dogumTarihi.getTime()
    );
    if (sonrakiKuru) {
      // Bu kuruya çıkarma olayının, bir sonraki doğumdan önce olduğundan emin olalım
      const sonrakiDogum = dogumlar.find((d) => new Date(d.tarih).getTime() > dogumTarihi.getTime());
      if (!sonrakiDogum || new Date(sonrakiKuru.tarih).getTime() <= new Date(sonrakiDogum.tarih).getTime()) {
        totalLaktasyon += getDiffDays(dogum.tarih, sonrakiKuru.tarih);
        completedLaktasyonCount++;
      }
    }
  });

  if (completedLaktasyonCount > 0) {
    ortalamaLaktasyonSuresiGun = Math.floor(totalLaktasyon / completedLaktasyonCount);
  }

  return {
    laktasyonSuresiGun,
    ortalamaLaktasyonSuresiGun,
    ilkTohumlamaYasiGun,
    ilkGebelikYasiGun,
    ilkBuzagilamaYasiGun,
    buzagilamaArasiSureGun,
    servisPeriyoduGun,
    gebelikBasinaTohumlama,
    laktasyonSayisi
  };
};

export const calculateMalePerformance = (
  hayvan: Hayvan,
  uremeKayitlari: UremeKaydi[],
  buzagiKaydi?: BuzagiKaydi,
  agirlikKayitlari?: AgirlikKaydi[]
) => {
  const sortedUreme = [...uremeKayitlari].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );

  const asimVeSpermalar = sortedUreme.filter(
    (r) => r.tur === 'Doğal Aşım' || r.tur === 'Sperma Alımı'
  );

  // İlkine damızlıkta kullanma yaşı
  let ilkDamizlikYasiGun: number | null = null;
  if (asimVeSpermalar.length > 0) {
    ilkDamizlikYasiGun = getDiffDays(hayvan.dogumTarihi, asimVeSpermalar[0].tarih);
  }

  // Günlük canlı ağırlık artışı (DLWG)
  let gunlukAgirlikArtisiKg: number | null = null;
  
  const sortedAgirliklar = [...(agirlikKayitlari || [])].sort(
    (a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime()
  );

  // Öncelik 1: İki tartım kaydı varsa
  if (sortedAgirliklar.length >= 2) {
    const enEski = sortedAgirliklar[0];
    const enYeni = sortedAgirliklar[sortedAgirliklar.length - 1];
    const gunFarki = getDiffDays(enEski.tarih, enYeni.tarih);
    
    if (gunFarki > 0) {
      gunlukAgirlikArtisiKg = Number(((enYeni.kg - enEski.kg) / gunFarki).toFixed(3));
    }
  } 
  // Öncelik 2: Doğum ağırlığı girilmişse
  else if (buzagiKaydi?.dogumAgirligiKg && hayvan.guncelAgirlikKg > 0) {
    const yasGun = getDiffDays(hayvan.dogumTarihi, new Date());
    if (yasGun > 0) {
      gunlukAgirlikArtisiKg = Number(((hayvan.guncelAgirlikKg - buzagiKaydi.dogumAgirligiKg) / yasGun).toFixed(3));
    }
  }

  return {
    ilkDamizlikYasiGun,
    gunlukAgirlikArtisiKg
  };
};
