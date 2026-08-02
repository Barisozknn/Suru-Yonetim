import { db } from '../lib/db';
import { parseRasyonCost } from './dashboardCalculations';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';

export const syncDailyAnimalFeedCosts = async () => {
  const ciftlikId = useStore.getState().activeCiftlikId;
  if (!ciftlikId) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Tüm aktif inekleri bul
    const inekler = await db.hayvanlar
      .where('ciftlikId')
      .equals(ciftlikId)
      .filter(h => h.tur === 'İnek' && h.durum === 'Aktif')
      .toArray();

    if (inekler.length === 0) return;

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

    for (const inek of inekler) {
      if (kaydedilmisHayvanIds.has(inek.id)) continue;

      let maliyet = 0;

      if (inek.grupId) {
        const grup = gruplar.find(g => g.id === inek.grupId);
        if (grup && grup.rasyonOzet) {
          maliyet = parseRasyonCost(grup.rasyonOzet, yemler);
        }
      }

      if (maliyet > 0) {
        yeniKayitlar.push({
          id: uuidv4(),
          ciftlikId,
          hayvanId: inek.id,
          tarih: today,
          maliyet
        });
      }
    }

    if (yeniKayitlar.length > 0) {
      await db.hayvanGunlukYemMaliyetleri.bulkAdd(yeniKayitlar);
      console.log(`${yeniKayitlar.length} inek için günlük yem maliyeti kaydedildi.`);
    }

  } catch (error) {
    console.error('Günlük hayvan yem maliyeti senkronizasyon hatası:', error);
  }
};
