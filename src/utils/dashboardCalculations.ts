import type { Hayvan, SutKaydi, PlanlananAsi, UremeKaydi, Yem, Grup } from '../types';
import { useStore } from '../store/useStore';
import { calculateFemalePerformance } from './performanceCalculations';
import { getUremeAyarForIrk } from './reproductionSettings';

export const calculateTotalAnimals = (hayvanlar: Hayvan[]): number => {
  return hayvanlar.length;
};

export const calculateSpeciesDistribution = (hayvanlar: Hayvan[]) => {
  const dist: Record<string, number> = {};
  hayvanlar.forEach(h => {
    dist[h.tur] = (dist[h.tur] || 0) + 1;
  });
  return Object.entries(dist).map(([name, value]) => ({ name, value }));
};

export const calculateAverageMilkYield7Days = (sutKayitlari: SutKaydi[]): number => {
  if (!sutKayitlari || sutKayitlari.length === 0) return 0;
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentRecords = sutKayitlari.filter(k => {
    const d = new Date(k.tarih);
    return d >= sevenDaysAgo && d <= now;
  });

  if (recentRecords.length === 0) return 0;

  // Günde birden fazla öğün girildiğinde hatalı ortalama hesaplanmaması için
  // inek-gün (hayvanId + tarih) bazında topla
  const byAnimalDay: Record<string, number> = {};
  recentRecords.forEach(k => {
    const hid = k.hayvanId || 'unknown'; // Test ortamı uyumluluğu için
    const key = `${hid}_${k.tarih}`;
    byAnimalDay[key] = (byAnimalDay[key] || 0) + k.litre;
  });

  const uniqueCowDays = Object.keys(byAnimalDay).length;
  if (uniqueCowDays === 0) return 0;

  const totalLiters = Object.values(byAnimalDay).reduce((sum, litre) => sum + litre, 0);
  return totalLiters / uniqueCowDays;
};


export const getActiveHealthAlertsCount = (asilar: PlanlananAsi[], hayvanlar: Hayvan[]): number => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Gecikmiş aşılar
  let count = asilar.filter(a => !a.yapildiMi && new Date(a.planlanaTarih) < today).length;

  // Arınma süresi devam edenler
  hayvanlar.forEach(h => {
    if ((h as any).arinmaBitisTarihi && new Date((h as any).arinmaBitisTarihi) >= today) {
      count++;
    }
  });

  return count;
};

export const getUpcomingBirths = (uremeKayitlari: UremeKaydi[], hayvanlar: Hayvan[], maxDays: number = 30) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const inDays = new Date(today);
  inDays.setDate(today.getDate() + maxDays);
  const pastDays = new Date(today);
  pastDays.setDate(today.getDate() - 15);

  const results: { hayvanId: string; dogumTarihi: Date }[] = [];
  const grouped = uremeKayitlari.reduce((acc, curr) => {
    if (!acc[curr.hayvanId]) acc[curr.hayvanId] = [];
    acc[curr.hayvanId].push(curr);
    return acc;
  }, {} as Record<string, UremeKaydi[]>);

  const { uremeAyarlari } = useStore.getState();

  for (const [hayvanId, olaylar] of Object.entries(grouped)) {
    const hayvan = hayvanlar.find(h => h.id === hayvanId);
    const irkAyari = getUremeAyarForIrk(hayvan?.irk, uremeAyarlari);

    olaylar.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    const sonOlay = olaylar[0];
    let tahminiDogum: Date | null = null;

    if (sonOlay.tur === 'Kuruya Çıkarma') {
      const sonTohumlama = olaylar.find(o => o.tur === 'Tohumlama/Aşım');
      tahminiDogum = new Date(sonTohumlama ? sonTohumlama.tarih : sonOlay.tarih);
      tahminiDogum.setDate(tahminiDogum.getDate() + (sonTohumlama ? irkAyari.gebelikSuresi : irkAyari.kuruyaCikarma));
    } else if (sonOlay.tur === 'Gebelik Kontrolü' && sonOlay.durum === 'Gebe') {
      const sonTohumlama = olaylar.find(o => o.tur === 'Tohumlama/Aşım');
      if (sonTohumlama) {
        tahminiDogum = new Date(sonTohumlama.tarih);
        tahminiDogum.setDate(tahminiDogum.getDate() + irkAyari.gebelikSuresi);
      }
    }
    
    if (tahminiDogum && tahminiDogum >= pastDays && tahminiDogum <= inDays) {
      results.push({ hayvanId, dogumTarihi: tahminiDogum });
    }
  }

  return results.sort((a, b) => a.dogumTarihi.getTime() - b.dogumTarihi.getTime());
};

export const getExpectedBirths30DaysCount = (uremeKayitlari: UremeKaydi[], hayvanlar: Hayvan[]): number => {
  return getUpcomingBirths(uremeKayitlari, hayvanlar, 30).length;
};

export const getUpcomingHeatChecks = (uremeKayitlari: UremeKaydi[], hayvanlar: Hayvan[]) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const past7Days = new Date(today);
  past7Days.setDate(past7Days.getDate() - 7);

  const results: { hayvanId: string; date: Date }[] = [];
  const grouped = uremeKayitlari.reduce((acc, curr) => {
    if (!acc[curr.hayvanId]) acc[curr.hayvanId] = [];
    acc[curr.hayvanId].push(curr);
    return acc;
  }, {} as Record<string, UremeKaydi[]>);

  const { uremeAyarlari } = useStore.getState();

  for (const [hayvanId, kayitlar] of Object.entries(grouped)) {
    const hayvan = hayvanlar.find(h => h.id === hayvanId);
    const irkAyari = getUremeAyarForIrk(hayvan?.irk, uremeAyarlari);

    kayitlar.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    const lastEvent = kayitlar[0];

    if (lastEvent.tur === 'Tohumlama/Aşım' || lastEvent.tur === 'Kızgınlık') {
      const heatDate = new Date(lastEvent.tarih);
      heatDate.setDate(heatDate.getDate() + irkAyari.kizginlikDongusu);
      if (heatDate >= past7Days && heatDate <= in7Days) results.push({ hayvanId, date: heatDate });
    } else if (lastEvent.tur === 'Gebelik Kontrolü' && (lastEvent.durum === 'Boş' || lastEvent.durum === 'Belirsiz')) {
      const heatDate = new Date(lastEvent.tarih);
      heatDate.setDate(heatDate.getDate() + irkAyari.kizginlikDongusu);
      if (heatDate >= past7Days && heatDate <= in7Days) results.push({ hayvanId, date: heatDate });
    }
  }
  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const getUpcomingReInseminations = (uremeKayitlari: UremeKaydi[], hayvanlar: Hayvan[]) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const past7Days = new Date(today);
  past7Days.setDate(past7Days.getDate() - 7);

  const results: { hayvanId: string; date: Date }[] = [];
  const grouped = uremeKayitlari.reduce((acc, curr) => {
    if (!acc[curr.hayvanId]) acc[curr.hayvanId] = [];
    acc[curr.hayvanId].push(curr);
    return acc;
  }, {} as Record<string, UremeKaydi[]>);

  const { uremeAyarlari } = useStore.getState();

  for (const [hayvanId, kayitlar] of Object.entries(grouped)) {
    const hayvan = hayvanlar.find(h => h.id === hayvanId);
    const irkAyari = getUremeAyarForIrk(hayvan?.irk, uremeAyarlari);

    kayitlar.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    const lastEvent = kayitlar[0];

    if (lastEvent.tur === 'Doğum') {
      const reDate = new Date(lastEvent.tarih);
      reDate.setDate(reDate.getDate() + irkAyari.yenidenTohumlamaUyarisi);
      if (reDate >= past7Days && reDate <= in7Days) results.push({ hayvanId, date: reDate });
    }
  }
  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const parseRasyonCost = (rasyonOzet: string, yemler: Yem[]): number => {
  if (!rasyonOzet) return 0;
  
  let totalCost = 0;
  const parts = rasyonOzet.split(', ');
  for (const part of parts) {
    const [yemAdi, miktarStr] = part.split(': ');
    if (yemAdi && miktarStr) {
      const kg = parseFloat(miktarStr.replace('kg', ''));
      const yem = yemler.find(y => y.ad === yemAdi);
      if (yem && !isNaN(kg)) {
        totalCost += (yem.birimFiyat * kg);
      }
    }
  }
  return totalCost;
};

export const calculateEstimatedFeedCostPerLiter = (
  yemler: Yem[], 
  gruplar: Grup[], 
  sutKayitlari: SutKaydi[],
  hayvanlar: Hayvan[] = []
): { cost: number; isValid: boolean } => {
  let dairyDailyCost = 0;
  
  gruplar.forEach(grup => {
    if (grup.rasyonAdi === 'Sütçü Rasyonu' && grup.rasyonOzet) {
      const actualHayvanSayisi = hayvanlar.length > 0 
        ? hayvanlar.filter(h => h.grupId === grup.id).length 
        : (grup.hayvanSayisi || 0);

      if (actualHayvanSayisi > 0) {
        const costPerAnimal = parseRasyonCost(grup.rasyonOzet, yemler);
        dairyDailyCost += (actualHayvanSayisi * costPerAnimal);
      }
    }
  });

  const avgMilk = calculateAverageMilkYield7Days(sutKayitlari);

  if (avgMilk <= 0 || dairyDailyCost <= 0) return { cost: 0, isValid: false };

  const now = new Date();
  now.setHours(0,0,0,0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentRecords = sutKayitlari.filter(k => {
    const d = new Date(k.tarih);
    return d >= sevenDaysAgo && d <= now;
  });

  const totalMilk7Days = recentRecords.reduce((sum, k) => sum + k.litre, 0);
  const herdDailyMilkProduction = totalMilk7Days / 7;

  if (herdDailyMilkProduction <= 0) return { cost: 0, isValid: false };

  const costPerLiter = dairyDailyCost / herdDailyMilkProduction;
  return { cost: costPerLiter, isValid: true };
};

export const calculateTotalDailyFeedCost = (
  yemler: Yem[], 
  gruplar: Grup[],
  hayvanlar: Hayvan[] = []
): number => {
  let totalDailyCost = 0;
  
  gruplar.forEach(grup => {
    if (grup.rasyonOzet) {
      const actualHayvanSayisi = hayvanlar.length > 0 
        ? hayvanlar.filter(h => h.grupId === grup.id).length 
        : (grup.hayvanSayisi || 0);

      if (actualHayvanSayisi > 0) {
        const costPerAnimal = parseRasyonCost(grup.rasyonOzet, yemler);
        totalDailyCost += (actualHayvanSayisi * costPerAnimal);
      }
    }
  });

  return totalDailyCost;
};

export const calculateHerdAveragePerformance = (hayvanlar: Hayvan[], uremeKayitlari: UremeKaydi[]) => {
  const inekler = hayvanlar.filter(h => h.tur === 'İnek' && h.durum === 'Aktif');
  
  if (inekler.length === 0) {
    return {
      servisPeriyoduOrt: null,
      ortalamaLaktasyonSuresiOrt: null,
      gebelikBasinaTohumlamaOrt: null,
      buzagilamaAraligiOrt: null
    };
  }

  let totalServis = 0; let servisCount = 0;
  let totalLaktasyon = 0; let laktasyonCount = 0;
  let totalTohum = 0; let tohumCount = 0;
  let totalBuzagilama = 0; let buzagilamaCount = 0;

  inekler.forEach(inek => {
    const inekKayitlar = uremeKayitlari.filter(k => k.hayvanId === inek.id);
    const perf = calculateFemalePerformance(inek, inekKayitlar);

    if (perf.servisPeriyoduGun !== null) {
      totalServis += perf.servisPeriyoduGun;
      servisCount++;
    }
    if (perf.ortalamaLaktasyonSuresiGun !== null) {
      totalLaktasyon += perf.ortalamaLaktasyonSuresiGun;
      laktasyonCount++;
    }
    if (perf.gebelikBasinaTohumlama !== null) {
      totalTohum += perf.gebelikBasinaTohumlama;
      tohumCount++;
    }
    if (perf.buzagilamaArasiSureGun !== null) {
      totalBuzagilama += perf.buzagilamaArasiSureGun;
      buzagilamaCount++;
    }
  });

  return {
    servisPeriyoduOrt: servisCount > 0 ? Math.floor(totalServis / servisCount) : null,
    ortalamaLaktasyonSuresiOrt: laktasyonCount > 0 ? Math.floor(totalLaktasyon / laktasyonCount) : null,
    gebelikBasinaTohumlamaOrt: tohumCount > 0 ? Number((totalTohum / tohumCount).toFixed(1)) : null,
    buzagilamaAraligiOrt: buzagilamaCount > 0 ? Math.floor(totalBuzagilama / buzagilamaCount) : null
  };
};
