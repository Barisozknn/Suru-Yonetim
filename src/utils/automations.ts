import { db } from '../lib/db';
import { notifyOverdueVaccines, notifyUpcomingBirths } from './notifications';


export const runDailyAutomations = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const hayvanlar = await db.hayvanlar.toArray();
    
    // Check if we already ran automations today to avoid redundant DB writes on every render
    const lastRun = localStorage.getItem('lastAutomationRunV3');
    if (lastRun === todayStr) {
      return;
    }

    // --- GÜNLÜK YEM MALİYETİ KAYDI (BACKFILL) ---
    // TEMİZLİK: React StrictMode yüzünden aynı güne 2 kere kayıt atılmış olabilir, fazlalıkları siliyoruz.
    const tumYemKayitlari = await db.gunlukYemMaliyetleri.toArray();
    const islenmisTarihler = new Set();
    for (const kayit of tumYemKayitlari) {
      if (islenmisTarihler.has(kayit.tarih)) {
        await db.gunlukYemMaliyetleri.delete(kayit.id);
      } else {
        islenmisTarihler.add(kayit.tarih);
      }
    }

    const gruplar = await db.gruplar.toArray();
    const yemler = await db.yemler.toArray();
    const { calculateTotalDailyFeedCost } = await import('./dashboardCalculations');
    const todayCost = calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (lastRun) {
      const lastDate = new Date(lastRun);
      lastDate.setHours(0,0,0,0);
      
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        for (let i = 1; i <= diffDays; i++) {
          const d = new Date(lastDate);
          d.setDate(d.getDate() + i);
          const dStr = d.toISOString().split('T')[0];
          
          const existing = await db.gunlukYemMaliyetleri.where('tarih').equals(dStr).first();
          if (!existing) {
            const newId = crypto.randomUUID();
            const payload = { id: newId, tarih: dStr, toplamMaliyet: todayCost };
            await db.gunlukYemMaliyetleri.put(payload as any);
            await db.syncQueue.add({ table: 'gunlukYemMaliyetleri', action: 'INSERT', payload, created_at: Date.now() });
          }
        }
      }
    } else {
      const existing = await db.gunlukYemMaliyetleri.where('tarih').equals(todayStr).first();
      if (!existing) {
        const newId = crypto.randomUUID();
        const payload = { id: newId, tarih: todayStr, toplamMaliyet: todayCost };
        await db.gunlukYemMaliyetleri.put(payload as any);
        await db.syncQueue.add({ table: 'gunlukYemMaliyetleri', action: 'INSERT', payload, created_at: Date.now() });
      }
    }
    // ---------------------------------------------

    // --- HAYVAN YAŞ / KATEGORİ GÜNCELLEMESI (WEB WORKER ile) ---
    // Önce doğum kayıtlarını çek (worker'a göndermek için)
    const uremeKayitlariAll = await db.uremeKayitlari.toArray();
    const hayvanlarWithCalved = hayvanlar.map(h => ({
      id: h.id,
      tur: h.tur,
      cinsiyet: h.cinsiyet,
      dogumTarihi: h.dogumTarihi,
      kisirlastirildiMi: h.kisirlastirildiMi,
      hasCalved: uremeKayitlariAll.some(u => u.hayvanId === h.id && u.tur === 'Doğum')
    }));

    // Worker'ı başlat ve hesaplamayı devret
    const workerResult = await new Promise<{ updates: { id: string; yeniTur: string }[] }>((resolve) => {
      const worker = new Worker(
        new URL('../workers/automations.worker.ts', import.meta.url),
        { type: 'module' }
      );
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
      worker.onerror = (err) => {
        console.error('[AutoWorker] Hata:', err);
        resolve({ updates: [] }); // Hata durumunda güncelleme yapma
        worker.terminate();
      };
      worker.postMessage({ hayvanlar: hayvanlarWithCalved });
    });

    // Worker'dan gelen güncellemeleri DB'ye yaz (main thread)
    let updatedCount = 0;
    for (const update of workerResult.updates) {
      const hayvan = hayvanlar.find(h => h.id === update.id);
      if (hayvan) {
        const updatedHayvan = { ...hayvan, tur: update.yeniTur as typeof hayvan.tur };
        await db.hayvanlar.put(updatedHayvan);
        await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
        updatedCount++;
      }
    }
    // -------------------------------------------------------

    if (updatedCount > 0 && navigator.onLine) {
       const { processSyncQueue } = await import('../services/syncService');
       processSyncQueue();
    }


    localStorage.setItem('lastAutomationRunV3', todayStr);

    // Gecikmiş aşı ve yaklaşan doğum bildirimleri
    const today2 = new Date();
    today2.setHours(0, 0, 0, 0);
    const planlananAsilar = await db.planlananAsilar.toArray();
    const gecikmisAsiSayisi = planlananAsilar.filter(
      a => !a.yapildiMi && new Date(a.planlanaTarih) < today2
    ).length;
    notifyOverdueVaccines(gecikmisAsiSayisi);

    const { getUpcomingBirths } = await import('./dashboardCalculations');
    const uremeKayitlari = await db.uremeKayitlari.toArray();
    const yaklasanDogumSayisi = getUpcomingBirths(uremeKayitlari, hayvanlar, 7).length;
    notifyUpcomingBirths(yaklasanDogumSayisi);

    if (updatedCount > 0) {
      console.log(`[Auto] ${updatedCount} hayvanın yaş/kategori bilgisi güncellendi.`);
    }

  } catch (err) {
    console.error('Otomasyon hatası:', err);
  }
};
