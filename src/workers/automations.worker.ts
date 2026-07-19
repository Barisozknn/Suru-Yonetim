/**
 * Automations Web Worker
 *
 * Bu worker, main thread'i bloklamadan hayvanların yaş/kategori
 * hesaplamalarını arka planda yapar.
 *
 * PATTERN:
 * 1. Main thread Dexie'den tüm veriyi okur
 * 2. Ham veriyi bu worker'a postMessage ile gönderir
 * 3. Worker hesaplar, sonuçları postMessage ile geri gönderir
 * 4. Main thread sonuçları Dexie'ye yazar
 *
 * NOT: Web Worker'lar Dexie/IndexedDB'ye doğrudan erişemez.
 * Tüm DB okuma/yazma işlemleri main thread'de kalır.
 */

type Cinsiyet = 'Erkek' | 'Dişi';
type HayvanTur = 'İnek' | 'Tosun' | 'Boğa' | 'Öküz' | 'Düve' | 'Dana' | 'Buzağı';

interface HayvanInput {
  id: string;
  tur: HayvanTur;
  cinsiyet: Cinsiyet;
  dogumTarihi: string;
  kisirlastirildiMi?: boolean;
  hasCalved?: boolean; // Doğum kaydı var mı (main thread'den gönderilir)
}

interface AutomationUpdate {
  id: string;
  yeniTur: HayvanTur;
}

interface AutomationResult {
  type: 'AUTOMATION_DONE';
  updates: AutomationUpdate[];
}

const calculateAgeInDays = (birthDateStr: string): number => {
  const birth = new Date(birthDateStr);
  birth.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = Math.max(0, today.getTime() - birth.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const calculateExpectedTur = (h: HayvanInput): HayvanTur => {
  if (!h.dogumTarihi) return h.tur;

  const ageDays = calculateAgeInDays(h.dogumTarihi);
  let expectedTur: HayvanTur = h.tur;

  // Eski 'Sığır' kayıtlarını migrate et
  if ((expectedTur as string) === 'Sığır') {
    expectedTur = 'İnek';
  }

  if (ageDays <= 180) {
    expectedTur = 'Buzağı';
  } else if (ageDays > 180 && ageDays <= 365) {
    expectedTur = h.cinsiyet === 'Erkek' ? 'Dana' : 'Düve';
  } else if (ageDays > 365) {
    if (h.cinsiyet === 'Erkek') {
      expectedTur = ageDays <= 730 ? 'Tosun' : (h.kisirlastirildiMi ? 'Öküz' : 'Boğa');
    } else {
      // Dişi: doğum yapmışsa İnek, yoksa Düve
      expectedTur = h.hasCalved ? 'İnek' : 'Düve';
    }
  }

  // İnek/Sığır olarak manuel kaydedilmişse koru
  if (h.cinsiyet === 'Dişi' && !h.hasCalved) {
    if (h.tur === 'İnek' || (h.tur as string) === 'Sığır') {
      expectedTur = 'İnek';
    }
  }

  return expectedTur;
};

self.onmessage = (e: MessageEvent<{ hayvanlar: HayvanInput[] }>) => {
  const { hayvanlar } = e.data;

  const updates: AutomationUpdate[] = [];

  for (const h of hayvanlar) {
    const yeniTur = calculateExpectedTur(h);
    if (yeniTur !== h.tur) {
      updates.push({ id: h.id, yeniTur });
    }
  }

  const result: AutomationResult = { type: 'AUTOMATION_DONE', updates };
  self.postMessage(result);
};
