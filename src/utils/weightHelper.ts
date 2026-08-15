import { db } from '../lib/db';

export const updateAnimalCurrentWeight = async (hayvanId: string) => {
  const hayvan = await db.hayvanlar.get(hayvanId);
  if (!hayvan) return;

  const allRecords = await db.agirlikKayitlari.where('hayvanId').equals(hayvanId).toArray();
  const sortedRecords = allRecords.sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
  const latestWeight = sortedRecords.length > 0 ? sortedRecords[0].kg : 0;

  await db.hayvanlar.update(hayvanId, { guncelAgirlikKg: latestWeight });
  await db.syncQueue.add({
    table: 'hayvanlar',
    action: 'UPDATE',
    payload: { ...hayvan, guncelAgirlikKg: latestWeight },
    created_at: Date.now()
  });
};
