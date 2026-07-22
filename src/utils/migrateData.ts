import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export const migrateOrphanDataToDefaultFarm = async () => {
  const state = useStore.getState();
  let defaultFarmId = state.activeCiftlikId;

  // 1. Çiftlik yoksa 'Varsayılan Çiftlik' oluştur
  const allFarms = await db.ciftlikler.toArray();
  const ciftlikCount = allFarms.length;
  
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
  } else {
    // Db'de var ama Store'da yoksa (pullInitialData boş getirdiği için silindiyse)
    if (state.ciftlikler.length === 0) {
      state.setCiftlikler(allFarms);
    }
    
    if (!defaultFarmId) {
      const firstFarm = allFarms[0];
      defaultFarmId = firstFarm.id;
      state.setActiveCiftlikId(firstFarm.id);
    }

    // Misafir modunda oluşturulup sonradan hesaba giriş yapılan çiftlikleri buluta senkronize et
    if (state.user) {
      for (const farm of allFarms) {
        if (!farm.user_id || farm.user_id !== state.user.id) {
          farm.user_id = state.user.id;
          await db.ciftlikler.put(farm);
          await supabase.from('ciftlikler').upsert({ id: farm.id, ad: farm.ad, user_id: state.user.id });
          
          // Çiftlik yeni senkronize edildiği için içindeki veriler de (daha önce FK hatası yüzünden) senkronize olamamış olabilir.
          // Bunları tekrar syncQueue'ya ekleyelim ki buluta gitsinler.
          const tablesToSync = ['hayvanlar', 'gruplar', 'yemler', 'yemHareketleri', 'sutKayitlari', 'agirlikKayitlari', 'saglikOlaylari', 'asiProtokolleri', 'planlananAsilar', 'uremeKayitlari', 'buzagiKayitlari', 'ekFinansalIslemler'];
          for (const tbl of tablesToSync) {
             const records = await db.table(tbl).filter(r => r.ciftlikId === farm.id).toArray();
             for (const r of records) {
                await db.syncQueue.put({
                  table: tbl,
                  action: 'INSERT',
                  payload: r,
                  created_at: Date.now()
                });
             }
          }
        }
      }
      state.setCiftlikler(await db.ciftlikler.toArray());
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
