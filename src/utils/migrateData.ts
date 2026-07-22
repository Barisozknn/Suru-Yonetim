import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export const migrateOrphanDataToDefaultFarm = async () => {
  const state = useStore.getState();
  let defaultFarmId = state.activeCiftlikId;

  // 1. Çiftlik yoksa 'Varsayılan Çiftlik' oluştur
  const ciftlikCount = await db.ciftlikler.count();
  if (ciftlikCount === 0) {
    const newFarm = {
      id: crypto.randomUUID(),
      ad: 'Varsayılan Çiftlik',
      user_id: state.user?.id,
      olusturulmaTarihi: new Date().toISOString()
    };
    await db.ciftlikler.add(newFarm);
    defaultFarmId = newFarm.id;
    
    // Store'u güncelle
    state.setCiftlikler([newFarm]);
    state.setActiveCiftlikId(newFarm.id);

    // Varsa Buluta gönder
    if (state.user) {
      supabase.from('ciftlikler').insert({
        id: newFarm.id,
        ad: newFarm.ad,
        user_id: state.user.id
      }).then();
    }
  } else if (!defaultFarmId) {
    // Mobilde localStorage temizlendiyse activeCiftlikId null olabilir
    // Ama IndexedDB'de çiftlik varsa, ilk çiftliği seç
    const firstFarm = await db.ciftlikler.toCollection().first();
    if (firstFarm) {
      defaultFarmId = firstFarm.id;
      // Zustand state'ini de güncelle
      const allFarms = await db.ciftlikler.toArray();
      state.setCiftlikler(allFarms);
      state.setActiveCiftlikId(firstFarm.id);
    }
  }

  if (!defaultFarmId) return;

  // 2. Tüm tablolarda ciftlikId'si olmayan verileri bu çiftliğe ata
  const tablesToMigrate = [
    'hayvanlar', 'gruplar', 'yemler', 'yemHareketleri', 'sutKayitlari', 
    'agirlikKayitlari', 'saglikOlaylari', 'asiProtokolleri', 'planlananAsilar', 
    'uremeKayitlari', 'buzagiKayitlari', 'sohbetler', 'ekFinansalIslemler', 
    'gunlukYemMaliyetleri'
  ];

  for (const tableName of tablesToMigrate) {
    try {
      const table = db.table(tableName);
      const recordsToUpdate = await table.filter((record: any) => !record.ciftlikId).toArray();
      
      if (recordsToUpdate.length > 0) {
        console.log(`${tableName} tablosunda ${recordsToUpdate.length} kayit guncelleniyor...`);
        
        // Dexie bulk put for updates
        const updatedRecords = recordsToUpdate.map((r: any) => ({ ...r, ciftlikId: defaultFarmId }));
        await table.bulkPut(updatedRecords);

        // Buluta da senkronize et ki tekrar çektiğimizde bozulmasın
        if (state.user) {
          for (const record of updatedRecords) {
            await db.syncQueue.add({
              table: tableName,
              action: 'UPDATE',
              payload: record,
              created_at: Date.now()
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Migration error on table ${tableName}:`, err);
    }
  }
};
