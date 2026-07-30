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

  const hayvanlar        = useLiveFarmQuery(() => db.hayvanlar.toArray())        ?? [];
  const sutKayitlari     = useLiveFarmQuery(() => db.sutKayitlari.toArray())     ?? [];
  const agirlikKayitlari = useLiveFarmQuery(() => db.agirlikKayitlari.toArray()) ?? [];
  const uremeKayitlari   = useLiveFarmQuery(() => db.uremeKayitlari.toArray())   ?? [];

  const uyarilar = useMemo(
    () =>
      detectAllAnomalies({
        hayvanlar,
        sutKayitlari,
        agirlikKayitlari,
        uremeKayitlari,
        uremeAyarlari,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hayvanlar, sutKayitlari, agirlikKayitlari, uremeKayitlari, uremeAyarlari],
  );

  return uyarilar;
}