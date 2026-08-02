import { useMemo } from 'react';
import { useLiveFarmQuery } from './useLiveFarmQuery';
import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { detectAllAnomalies } from '../utils/anomalyDetection';
import type { UyariItem } from '../types';

/**
 * Dexie verilerini reaktif olarak dinleyip anomali uyarilarini hesaplar.
 *
 * - useLiveFarmQuery pattern'ini takip eder => activeCiftlikId degisince otomatik gunceller
 * - useMemo ile veri degismediginde gereksiz yeniden hesaplama yapilmaz
 * - Siralama: KRITIK => ORTA => DUSUK, sonra kupe no
 */
export function useAnomalyDetection(): UyariItem[] {
  const uremeAyarlari = useStore((s) => s.uremeAyarlari);

  const hayvanlar        = useLiveFarmQuery(() => db.hayvanlar.toArray());
  const sutKayitlari     = useLiveFarmQuery(() => db.sutKayitlari.toArray());
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray());
  const uremeKayitlari   = useLiveFarmQuery(() => db.uremeKayitlari.toArray());

  const uyarilar = useMemo(() => {
    // Dexie'den tüm veriler asenkron olarak gelene kadar (undefined iken)
    // yarım yamalak veriyle yanlış (false-positive) anomali hesaplamamak için bekle.
    if (
      hayvanlar === undefined ||
      sutKayitlari === undefined ||
      agirlikKayitlari === undefined ||
      uremeKayitlari === undefined
    ) {
      return [];
    }

    return detectAllAnomalies({
      hayvanlar,
      sutKayitlari,
      agirlikKayitlari,
      uremeKayitlari,
      uremeAyarlari,
    });
  }, [hayvanlar, sutKayitlari, agirlikKayitlari, uremeKayitlari, uremeAyarlari]);

  return uyarilar;
}