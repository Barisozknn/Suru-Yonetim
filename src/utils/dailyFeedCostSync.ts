import { db } from '../lib/db';
import { parseRasyonCost } from './dashboardCalculations';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';

// Concurrency kilidi (React Strict Mode için)
declare global {
  interface Window {
    __isFeedSyncing?: boolean;
  }
}

export const syncDailyAnimalFeedCosts = async () => {
  if (window.__isFeedSyncing) return;
  window.__isFeedSyncing = true;

  try {
    const ciftlikId = useStore.getState().activeCiftlikId;
    if (!ciftlikId) return;

    const today = new Date().toISOString().split('T')[0];

    // TEMİZLİK: React Strict Mode yüzünden aynı güne 2 kere kayıt atılmışsa fazlalıkları siliyoruz.
    const bugunKayitlariTumu = await db.hayvanGunlukYemMaliyetleri
      .where('ciftlikId')
      .equals(ciftlikId)
      .filter(k => k.tarih === today)
      .toArray();

    const islenmisHayvanlar = new Set();
    for (const kayit of bugunKayitlariTumu) {
      if (islenmisHayvanlar.has(kayit.hayvanId)) {
        await db.hayvanGunlukYemMaliyetleri.delete(kayit.id);
      } else {
        islenmisHayvanlar.add(kayit.hayvanId);
      }
    }

    // Tüm aktif hayvanları bul
    const aktifHayvanlar = await db.hayvanlar
      .where('ciftlikId')
      .equals(ciftlikId)
      .filter(h => h.durum === 'Aktif')
      .toArray();

    if (aktifHayvanlar.length === 0) return;

    const gruplar = await db.gruplar.where('ciftlikId').equals(ciftlikId).toArray();
    const yemler = await db.yemler.where('ciftlikId').equals(ciftlikId).toArray();

    // Bugün için önceden kaydedilmiş maliyetleri bul
    const bugunKayitlari = await db.hayvanGunlukYemMaliyetleri
      .where('ciftlikId')
      .equals(ciftlikId)
      .filter(k => k.tarih === today)
      .toArray();

    const kaydedilmisHayvanIds = new Set(bugunKayitlari.map(k => k.hayvanId));

    const yeniKayitlar = [];

    for (const hayvan of aktifHayvanlar) {
      if (kaydedilmisHayvanIds.has(hayvan.id)) continue;

      let maliyet = 0;

      if (hayvan.grupId) {
        const grup = gruplar.find(g => g.id === hayvan.grupId);
        if (grup && grup.rasyonOzet) {
          maliyet = parseRasyonCost(grup.rasyonOzet, yemler);
        }
      }

      if (maliyet > 0) {
        yeniKayitlar.push({
          id: uuidv4(),
          ciftlikId,
          hayvanId: hayvan.id,
          tarih: today,
          maliyet
        });
      }
    }

    if (yeniKayitlar.length > 0) {
      await db.hayvanGunlukYemMaliyetleri.bulkAdd(yeniKayitlar);
      console.log(`${yeniKayitlar.length} hayvan için günlük yem maliyeti kaydedildi.`);
    }

  } catch (error) {
    console.error('Günlük hayvan yem maliyeti senkronizasyon hatası:', error);
  } finally {
    window.__isFeedSyncing = false;
  }
};
