import type {
  Hayvan,
  SutKaydi,
  AgirlikKaydi,
  UremeKaydi,
  BuzagiKaydi,
  SaglikOlayi,
  UyariItem,
  UyariTipi,
  UyariSiddeti,
} from '../types';
import type { UremeAyarlari } from '../store/useStore';
import { getUremeAyarForIrk } from './reproductionSettings';

// ─── Yardimci Fonksiyonlar ─────────────────────────────────────────────────

function makeId(hayvanId: string, tip: UyariTipi): string {
  return `${hayvanId}_${tip}`;
}

function getDiffDays(d1: Date, d2: Date): number {
  const a = new Date(d1); a.setHours(0, 0, 0, 0);
  const b = new Date(d2); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function buildDailyMilkMap(
  kayitlar: SutKaydi[],
  hayvanId: string,
  fromDate: Date,
  toDate: Date,
): Map<string, number> {
  const map = new Map<string, number>();
  kayitlar
    .filter((k) => k.hayvanId === hayvanId)
    .forEach((k) => {
      const d = new Date(k.tarih);
      if (d >= fromDate && d <= toDate) {
        const key = k.tarih.split('T')[0];
        map.set(key, (map.get(key) ?? 0) + k.litre);
      }
    });
  return map;
}

function avgOfMap(map: Map<string, number>): number {
  if (map.size === 0) return 0;
  let total = 0;
  map.forEach((v) => (total += v));
  return total / map.size;
}

// ─── 1. Sut Dusus Tespiti ─────────────────────────────────────────────────

/**
 * Her inek icin son 7 gun ortalamasini onceki 7 gunle karsilastirir.
 * Dusus >= %20 => KRITIK, >= %10 => ORTA
 * Minimum 3 gunluk veri yoksa calismaز (gurultu onleme).
 */
export function detectMilkDropAnomalies(
  hayvanlar: Hayvan[],
  sutKayitlari: SutKaydi[],
): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const day7 = new Date(now); day7.setDate(now.getDate() - 7);
  const day14 = new Date(now); day14.setDate(now.getDate() - 14);

  // Sadece aktif inekler
  const inekler = hayvanlar.filter(
    (h) => h.tur === 'İnek' && h.durum === 'Aktif',
  );

  for (const inek of inekler) {
    const son7 = buildDailyMilkMap(sutKayitlari, inek.id, day7, now);
    const once7 = buildDailyMilkMap(sutKayitlari, inek.id, day14, day7);

    if (son7.size < 3 || once7.size < 3) continue;

    const avgSon = avgOfMap(son7);
    const avgOnce = avgOfMap(once7);

    if (avgOnce <= 0) continue;

    const dusus = (avgOnce - avgSon) / avgOnce;

    let siddet: UyariSiddeti | null = null;
    if (dusus >= 0.20) siddet = 'KRITIK';
    else if (dusus >= 0.10) siddet = 'ORTA';

    if (siddet) {
      const yuzde = Math.round(dusus * 100);
      uyarilar.push({
        id: makeId(inek.id, 'SUT_DUSUS'),
        hayvanId: inek.id,
        hayvanKupeNo: inek.kupeNo,
        tip: 'SUT_DUSUS',
        siddet,
        mesaj: `Süt verimi son 7 günde %${yuzde} düştü`,
        detay: `Önceki ort: ${avgOnce.toFixed(1)} Lt/gün → Şimdiki: ${avgSon.toFixed(1)} Lt/gün`,
        tarih: now,
        linkTo: `/hayvanlar?id=${inek.id}`,
      });
    }
  }

  return uyarilar;
}

// ─── 2. Agirlik Buyume Sapmasi ────────────────────────────────────────────

/**
 * Dana ve Buzagilar icin teorik ADG beklentisine gore gercek agirligi kontrol eder.
 * Beklenen agirlik = dogum agirligi (varsayilan 40 kg) + yas_gun x beklenen_ADG
 * Sapma >= %25 => KRITIK, >= %15 => ORTA
 */
export function detectWeightGrowthAnomalies(
  hayvanlar: Hayvan[],
  agirlikKayitlari: AgirlikKaydi[],
  buzagiKayitlari: BuzagiKaydi[] = [],
): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const gencler = hayvanlar.filter(
    (h) =>
      (h.tur === 'Dana' || h.tur === 'Buzağı') &&
      h.durum === 'Aktif' &&
      !!h.dogumTarihi,
  );

  for (const hayvan of gencler) {
    if (!hayvan.guncelAgirlikKg || hayvan.guncelAgirlikKg <= 0) continue;

    const dogumDate = new Date(hayvan.dogumTarihi);
    const yasGun = getDiffDays(dogumDate, now);
    if (yasGun < 30) continue;

    let beklenenAdgKg = 0.9;
    const irkLower = (hayvan.irk || '').toLowerCase();
    if (irkLower.includes('holstein') || irkLower.includes('siyah alaca')) {
      beklenenAdgKg = 0.85;
    } else if (irkLower.includes('simmental') || irkLower.includes('charolais')) {
      beklenenAdgKg = 1.1;
    } else if (irkLower.includes('jersey')) {
      beklenenAdgKg = 0.7;
    }

    const hayvanAgirliklar = agirlikKayitlari
      .filter((a) => a.hayvanId === hayvan.id)
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

    const sonAgirlik =
      hayvanAgirliklar.length > 0
        ? hayvanAgirliklar[0].kg
        : hayvan.guncelAgirlikKg;

    // Buzağı kaydından gerçek doğum ağırlığını al; yoksa irka özgü varsayılanı kullan
    const buzagiKaydi = buzagiKayitlari.find(b => b.hayvanId === hayvan.id);
    const irkDefaultDogumAgirligi = irkLower.includes('jersey') ? 25
      : (irkLower.includes('simmental') || irkLower.includes('charolais')) ? 48
      : 40; // Holstein / genel
    const dogumAgirligiKg = buzagiKaydi?.dogumAgirligiKg || irkDefaultDogumAgirligi;
    const beklenenAgirlik = dogumAgirligiKg + yasGun * beklenenAdgKg;

    const sapma = (beklenenAgirlik - sonAgirlik) / beklenenAgirlik;

    let siddet: UyariSiddeti | null = null;
    if (sapma >= 0.25) siddet = 'KRITIK';
    else if (sapma >= 0.15) siddet = 'ORTA';

    if (siddet) {
      const sapmaYuzde = Math.round(sapma * 100);
      uyarilar.push({
        id: makeId(hayvan.id, 'AGIRLIK_SAPMA'),
        hayvanId: hayvan.id,
        hayvanKupeNo: hayvan.kupeNo,
        tip: 'AGIRLIK_SAPMA',
        siddet,
        mesaj: `Büyüme hedefinin %${sapmaYuzde} gerisinde`,
        detay: `Mevcut: ${sonAgirlik} kg | Beklenen: ${beklenenAgirlik.toFixed(0)} kg (${yasGun} günlük)`,
        tarih: now,
        linkTo: `/hayvanlar?id=${hayvan.id}`,
      });
    }
  }

  return uyarilar;
}

// ─── 3. Ureme Gecikmesi Tespiti ───────────────────────────────────────────

/**
 * Dogum kaydi olan ancak ardindan tohumlama yapilmamis inekleri tespit eder.
 * Gecen gun > yenidenTohumlamaUyarisi => ORTA
 * Gecen gun > yenidenTohumlamaUyarisi x 2 => KRITIK
 */
export function detectReproductionDelays(
  hayvanlar: Hayvan[],
  uremeKayitlari: UremeKaydi[],
  uremeAyarlari: UremeAyarlari,
): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const inekler = hayvanlar.filter(
    (h) => h.tur === 'İnek' && h.durum === 'Aktif',
  );

  for (const inek of inekler) {
    const kayitlar = uremeKayitlari
      .filter((u) => u.hayvanId === inek.id)
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

    if (kayitlar.length === 0) continue;

    // DÜZELTME #2: Son kayıt değil, en son DOĞUM kaydını bul.
    // Doğumdan sonra başka kayıt (kızgınlık gözlemi vb.) girilmiş olsa bile uyarı tetiklenebilmeli.
    const sonDogum = kayitlar.find(k => k.tur === 'Doğum');
    if (!sonDogum) continue;

    const dogumDate = new Date(sonDogum.tarih);

    // Doğumdan SONRA başarılı bir tohumlama yapılmış mı?
    const tohumlamaVarMi = kayitlar.some(
      k => k.tur === 'Tohumlama/Aşım' && new Date(k.tarih) > dogumDate
    );
    if (tohumlamaVarMi) continue; // Tohumlama yapılmış, uyarı verme

    const gecenGun = getDiffDays(dogumDate, now);

    const esik = uremeAyarlari.yenidenTohumlamaUyarisi;
    if (gecenGun < esik) continue;

    const siddet: UyariSiddeti = gecenGun >= esik * 2 ? 'KRITIK' : 'ORTA';

    uyarilar.push({
      id: makeId(inek.id, 'UREME_GECIKME'),
      hayvanId: inek.id,
      hayvanKupeNo: inek.kupeNo,
      tip: 'UREME_GECIKME',
      siddet,
      mesaj: `Doğumdan ${gecenGun} gün geçti, tohumlama kaydı yok`,
      detay: `Önerilen pencere: ${esik}-90. gün (şu an ${gecenGun}. gün)`,
      tarih: now,
      linkTo: `/hayvanlar?id=${inek.id}`,
    });
  }

  return uyarilar;
}

// ─── 4. Uzamis Laktasyon Tespiti ──────────────────────────────────────────

/**
 * Son dogumdan bu yana gebelik suresi + kuru cikarma suresi gectiyse
 * ve kuru kaydi yoksa uyari verir.
 */
export function detectOverdueLactations(
  hayvanlar: Hayvan[],
  uremeKayitlari: UremeKaydi[],
  uremeAyarlari: UremeAyarlari,
): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const inekler = hayvanlar.filter(
    (h) => h.tur === 'İnek' && h.durum === 'Aktif',
  );

  // DÜZELTME #3: Doğru laktasyon eşiği
  // Zooteknik standart: 305 gün laktasyon + tolerans. Hedef buzağılama aralığı (380 gün) - kuru dönem (60 gün) = 320 gün.
  // Eski formül (gebelikSuresi + kuruyaCikarma = 343) mantıksal çelişki yaratıyordu.
  const HEDEF_BUZAGILAMA_ARALIGI = 380; // gün — Türkiye koşulları için kabul edilebilir
  const maxLaktasyon = HEDEF_BUZAGILAMA_ARALIGI - uremeAyarlari.kuruyaCikarma; // Varsayılan: 380 - 60 = 320 gün

  for (const inek of inekler) {
    const kayitlar = uremeKayitlari
      .filter((u) => u.hayvanId === inek.id)
      .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());

    const dogumlar = kayitlar.filter((u) => u.tur === 'Doğum');
    if (dogumlar.length === 0) continue;

    const sonDogum = dogumlar[dogumlar.length - 1];
    const sonDogumDate = new Date(sonDogum.tarih);

    const sonrakiOlay = kayitlar.find(
      (u) =>
        new Date(u.tarih) > sonDogumDate &&
        (u.tur === 'Kuruya Çıkarma' || u.tur === 'Doğum'),
    );

    if (sonrakiOlay) continue;

    const gecenGun = getDiffDays(sonDogumDate, now);
    if (gecenGun < maxLaktasyon) continue;

    const fazlaGun = gecenGun - maxLaktasyon;
    const siddet: UyariSiddeti = fazlaGun > 60 ? 'KRITIK' : 'ORTA';

    uyarilar.push({
      id: makeId(inek.id, 'LAKTASYON_UZADI'),
      hayvanId: inek.id,
      hayvanKupeNo: inek.kupeNo,
      tip: 'LAKTASYON_UZADI',
      siddet,
      mesaj: `Laktasyon normalin ${fazlaGun} gün üzerinde`,
      detay: `Son doğum: ${sonDogumDate.toLocaleDateString('tr-TR')} | ${gecenGun} gün aktif laktasyon`,
      tarih: now,
      linkTo: `/hayvanlar?id=${inek.id}`,
    });
  }

  return uyarilar;
}

// ─── 5. Kuruya Çıkarma Gecikmesi ──────────────────────────────────────────

function detectDryOffDelays(
  hayvanlar: Hayvan[],
  uremeKayitlari: UremeKaydi[],
  uremeAyarlari: UremeAyarlari,
): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const inekler = hayvanlar.filter((h) => h.tur === 'İnek' && h.durum === 'Aktif');

  for (const inek of inekler) {
    const irkAyari = getUremeAyarForIrk(inek.irk, uremeAyarlari);
    const kayitlar = uremeKayitlari
      .filter((k) => k.hayvanId === inek.id)
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());

    if (kayitlar.length === 0) continue;

    const sonOlay = kayitlar[0];
    
    // Yalnızca gebelik kontrolü Gebe olanlara kuruya çıkarma gerekir
    if (sonOlay.tur === 'Gebelik Kontrolü' && sonOlay.durum === 'Gebe') {
      const sonTohumlama = kayitlar.find(o => o.tur === 'Tohumlama/Aşım');
      if (sonTohumlama) {
        const tohumlamaDate = new Date(sonTohumlama.tarih);
        tohumlamaDate.setHours(0, 0, 0, 0);
        
        const gebelikSuresiGun = irkAyari.gebelikSuresi || 280;
        const kuruSuresiGun = irkAyari.kuruyaCikarma || 60;
        
        // Tahmini doğum
        const tahminiDogumDate = new Date(tohumlamaDate);
        tahminiDogumDate.setDate(tahminiDogumDate.getDate() + gebelikSuresiGun);
        
        // Önerilen kuruya çıkarma
        const onerilenKuruDate = new Date(tahminiDogumDate);
        onerilenKuruDate.setDate(onerilenKuruDate.getDate() - kuruSuresiGun);
        
        // Son tohumlamadan sonra Kuruya Çıkarma girilmiş mi?
        const kuruyaCikarmaVarMi = kayitlar.some(k => k.tur === 'Kuruya Çıkarma' && new Date(k.tarih) >= tohumlamaDate);
        
        if (!kuruyaCikarmaVarMi) {
          const gecenGun = Math.floor((now.getTime() - onerilenKuruDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (gecenGun > 0) {
            const siddet: UyariSiddeti = gecenGun >= 7 ? 'KRITIK' : 'ORTA';
            uyarilar.push({
              id: makeId(inek.id, 'KURUYA_CIKARMA_GECIKTI'),
              hayvanId: inek.id,
              hayvanKupeNo: inek.kupeNo,
              tip: 'KURUYA_CIKARMA_GECIKTI',
              siddet,
              mesaj: `Kuruya çıkarma ${gecenGun} gün gecikti`,
              detay: `Önerilen: ${onerilenKuruDate.toLocaleDateString('tr-TR')} (Doğum: ${tahminiDogumDate.toLocaleDateString('tr-TR')})`,
              tarih: now,
              linkTo: `/hayvanlar?id=${inek.id}`,
            });
          }
        }
      }
    }
  }
  return uyarilar;
}

// ─── Ana Birlestirici Fonksiyon ────────────────────────────────────────────

export interface AnomalyDetectionInput {
  hayvanlar: Hayvan[];
  sutKayitlari: SutKaydi[];
  agirlikKayitlari: AgirlikKaydi[];
  uremeKayitlari: UremeKaydi[];
  buzagiKayitlari: BuzagiKaydi[]; // #7: Gerçek doğum ağırlığı için
  saglikOlaylari: SaglikOlayi[];
  uremeAyarlari: UremeAyarlari;
}

const SIDDET_SIRA: Record<UyariSiddeti, number> = {
  KRITIK: 0,
  ORTA: 1,
  DUSUK: 2,
};

/**
 * Tum anomali algilayicilarini calistirir ve birlesik, oncelikli uyari listesi doner.
 * Ayni hayvan + tip icin tekrar yoktur (id ile tekillestirilir).
 */
// ─── 6. Yüksek Somatik Hücre Tespiti ──────────────────────────────────────
export function detectHighSCC(hayvanlar: Hayvan[], sutKayitlari: SutKaydi[]): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  
  const inekler = hayvanlar.filter(h => h.tur === 'İnek' && h.durum === 'Aktif');
  
  for (const inek of inekler) {
    const sonKayitlar = sutKayitlari
      .filter(k => k.hayvanId === inek.id && k.somatikHucre && getDiffDays(new Date(k.tarih), now) <= 30)
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      
    if (sonKayitlar.length === 0) continue;
    
    const avgSCC = sonKayitlar.reduce((acc, curr) => acc + (curr.somatikHucre || 0), 0) / sonKayitlar.length;
    
    if (avgSCC >= 200000) {
      const siddet: UyariSiddeti = avgSCC > 400000 ? 'KRITIK' : 'ORTA';
      uyarilar.push({
        id: makeId(inek.id, 'YUKSEK_SOMATIK_HUCRE'),
        hayvanId: inek.id,
        hayvanKupeNo: inek.kupeNo,
        tip: 'YUKSEK_SOMATIK_HUCRE',
        siddet,
        mesaj: `Yüksek Somatik Hücre (${Math.round(avgSCC).toLocaleString('tr-TR')})`,
        detay: `Mastitis riski! Son 30 gün SCC ortalaması yüksek.`,
        tarih: now,
        linkTo: `/hayvanlar?id=${inek.id}`
      });
    }
  }
  return uyarilar;
}

// ─── 7. Negatif Ağırlık Büyümesi Tespiti ─────────────────────────────────
export function detectNegativeADG(hayvanlar: Hayvan[], agirlikKayitlari: AgirlikKaydi[]): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  
  const aktifHayvanlar = hayvanlar.filter(h => h.durum === 'Aktif');
  
  for (const hayvan of aktifHayvanlar) {
    const kayitlar = agirlikKayitlari
      .filter(a => a.hayvanId === hayvan.id)
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      
    if (kayitlar.length < 2) continue;
    
    const son = kayitlar[0];
    const onceki = kayitlar[1];
    
    if (son.kg < onceki.kg) {
      const kayip = onceki.kg - son.kg;
      uyarilar.push({
        id: makeId(hayvan.id, 'NEGATIF_ADG'),
        hayvanId: hayvan.id,
        hayvanKupeNo: hayvan.kupeNo,
        tip: 'NEGATIF_ADG',
        siddet: 'ORTA',
        mesaj: `Ağırlık Kaybı (${kayip.toFixed(1)} kg)`,
        detay: `${new Date(onceki.tarih).toLocaleDateString('tr-TR')} tarihinde ${onceki.kg}kg iken şu an ${son.kg}kg.`,
        tarih: now,
        linkTo: `/hayvanlar?id=${hayvan.id}`
      });
    }
  }
  return uyarilar;
}

// ─── 8. Yüksek Sağlık Maliyeti Tespiti ───────────────────────────────────
export function detectHighHealthCost(hayvanlar: Hayvan[], saglikOlaylari: SaglikOlayi[]): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  
  const aktifHayvanlar = hayvanlar.filter(h => h.durum === 'Aktif');
  if (aktifHayvanlar.length === 0) return uyarilar;
  
  const son30GunOlaylar = saglikOlaylari.filter(o => getDiffDays(new Date(o.tarih), now) <= 30);
  if (son30GunOlaylar.length === 0) return uyarilar;
  
  const maliyetler = new Map<string, number>();
  let toplamMaliyet = 0;
  
  for (const olay of son30GunOlaylar) {
    if (!olay.maliyet) continue;
    toplamMaliyet += olay.maliyet;
    maliyetler.set(olay.hayvanId, (maliyetler.get(olay.hayvanId) || 0) + olay.maliyet);
  }
  
  const suruOrtMaliyet = toplamMaliyet / aktifHayvanlar.length;
  if (suruOrtMaliyet === 0) return uyarilar;
  
  for (const hayvan of aktifHayvanlar) {
    const hayvanMaliyet = maliyetler.get(hayvan.id) || 0;
    if (hayvanMaliyet > suruOrtMaliyet * 2 && hayvanMaliyet > 500) {
      uyarilar.push({
        id: makeId(hayvan.id, 'YUKSEK_SAGLIK_MALIYETI'),
        hayvanId: hayvan.id,
        hayvanKupeNo: hayvan.kupeNo,
        tip: 'YUKSEK_SAGLIK_MALIYETI',
        siddet: 'ORTA',
        mesaj: `Yüksek Sağlık Gideri`,
        detay: `Son 30 günde ₺${hayvanMaliyet.toFixed(0)} harcandı (Sürü ort.: ₺${suruOrtMaliyet.toFixed(0)})`,
        tarih: now,
        linkTo: `/hayvanlar?id=${hayvan.id}`
      });
    }
  }
  return uyarilar;
}

// ─── 9. Kuru Dönem Besleme Tespiti ───────────────────────────────────────
export function detectDryPeriodFeeding(hayvanlar: Hayvan[], uremeKayitlari: UremeKaydi[], uremeAyarlari: UremeAyarlari): UyariItem[] {
  const uyarilar: UyariItem[] = [];
  const now = new Date();
  
  const inekler = hayvanlar.filter(h => h.tur === 'İnek' && h.durum === 'Aktif');
  
  for (const inek of inekler) {
    const irkAyari = getUremeAyarForIrk(inek.irk, uremeAyarlari);
    const kayitlar = uremeKayitlari
      .filter((k) => k.hayvanId === inek.id)
      .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
      
    if (kayitlar.length === 0) continue;
    
    const sonOlay = kayitlar[0];
    if (sonOlay.tur === 'Gebelik Kontrolü' && sonOlay.durum === 'Gebe') {
       const sonTohumlama = kayitlar.find(o => o.tur === 'Tohumlama/Aşım');
       if (sonTohumlama) {
          const tohumlamaDate = new Date(sonTohumlama.tarih);
          const gebelikSuresiGun = irkAyari.gebelikSuresi || 280;
          const kuruSuresiGun = irkAyari.kuruyaCikarma || 60;
          
          const tahminiDogumDate = new Date(tohumlamaDate);
          tahminiDogumDate.setDate(tahminiDogumDate.getDate() + gebelikSuresiGun);
          
          const onerilenKuruDate = new Date(tahminiDogumDate);
          onerilenKuruDate.setDate(onerilenKuruDate.getDate() - kuruSuresiGun);
          
          const kuruyaKalanGun = getDiffDays(now, onerilenKuruDate);
          
          // Kuruya 1-14 gün kalmışsa haber ver (özel besleme diyeti için)
          // Zaten kuruya çıkmışsa (gecenGun < 0) uyarma.
          // Sonradan kuruya çıkarma olayı girilmiş mi?
          const kuruyaCikarmaGirilmisMi = kayitlar.some(k => k.tur === 'Kuruya Çıkarma' && new Date(k.tarih) >= tohumlamaDate);
          
          if (!kuruyaCikarmaGirilmisMi && kuruyaKalanGun > 0 && kuruyaKalanGun <= 14) {
             uyarilar.push({
               id: makeId(inek.id, 'KURU_DONEM_BESLEME'),
               hayvanId: inek.id,
               hayvanKupeNo: inek.kupeNo,
               tip: 'KURU_DONEM_BESLEME',
               siddet: 'DUSUK',
               mesaj: `Kuruya çıkmaya ${kuruyaKalanGun} gün kaldı`,
               detay: `Özel kuru dönem beslemesine geçiş planlayın. Hedef tarih: ${onerilenKuruDate.toLocaleDateString('tr-TR')}`,
               tarih: now,
               linkTo: `/hayvanlar?id=${inek.id}`
             });
          }
       }
    }
  }
  return uyarilar;
}

export function detectAllAnomalies(input: AnomalyDetectionInput): UyariItem[] {
  const { hayvanlar, sutKayitlari, agirlikKayitlari, uremeKayitlari, buzagiKayitlari, saglikOlaylari, uremeAyarlari } = input;

  const tum: UyariItem[] = [
    ...detectMilkDropAnomalies(hayvanlar, sutKayitlari),
    ...detectWeightGrowthAnomalies(hayvanlar, agirlikKayitlari, buzagiKayitlari),
    ...detectReproductionDelays(hayvanlar, uremeKayitlari, uremeAyarlari),
    ...detectOverdueLactations(hayvanlar, uremeKayitlari, uremeAyarlari),
    ...detectDryOffDelays(hayvanlar, uremeKayitlari, uremeAyarlari),
    ...detectHighSCC(hayvanlar, sutKayitlari),
    ...detectNegativeADG(hayvanlar, agirlikKayitlari),
    ...detectHighHealthCost(hayvanlar, saglikOlaylari),
    ...detectDryPeriodFeeding(hayvanlar, uremeKayitlari, uremeAyarlari),
  ];

  const gorulenIds = new Set<string>();
  const tekil = tum.filter((u) => {
    if (gorulenIds.has(u.id)) return false;
    gorulenIds.add(u.id);
    return true;
  });

  return tekil.sort((a, b) => {
    const siddetFark = SIDDET_SIRA[a.siddet] - SIDDET_SIRA[b.siddet];
    if (siddetFark !== 0) return siddetFark;
    return a.hayvanKupeNo.localeCompare(b.hayvanKupeNo, 'tr');
  });
}