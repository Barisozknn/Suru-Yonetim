import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';

const mapFromSupabaseHayvan = (row: any) => ({
  id: row.id,
  kupeNo: row.kupe_no,
  tur: row.tur,
  irk: row.irk,
  dogumTarihi: row.dogum_tarihi || '',
  cinsiyet: row.cinsiyet,
  guncelAgirlikKg: row.guncel_agirlik_kg || 0,
  durum: row.durum,
  grupId: row.grup_id,
  anneKupeNo: row.anne_kupe_no || undefined,
  babaKupeNo: row.baba_kupe_no || undefined,
  fotografUrl: row.fotograf_url,
  notlar: row.notlar,
  satisFiyati: row.satis_fiyati,
  satisTarihi: row.satis_tarihi,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseHayvan = (obj: any) => ({
  id: obj.id,
  kupe_no: obj.kupeNo,
  tur: obj.tur,
  irk: obj.irk,
  dogum_tarihi: obj.dogumTarihi || null,
  cinsiyet: obj.cinsiyet,
  guncel_agirlik_kg: obj.guncelAgirlikKg,
  grup_id: obj.grupId || null,
  durum: obj.durum,
  anne_kupe_no: obj.anneKupeNo || null,
  baba_kupe_no: obj.babaKupeNo || null,
  fotograf_url: obj.fotografUrl || null,
  notlar: obj.notlar || null,
  satis_fiyati: obj.satisFiyati || null,
  satis_tarihi: obj.satisTarihi || null,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId || null
});

const mapFromSupabaseGrup = (row: any) => ({
  id: row.id,
  ad: row.ad,
  tur: row.tur,
  aciklama: row.aciklama,
  rasyonAdi: row.rasyon_adi,
  rasyonOzet: row.rasyon_ozet,
  rasyonTarihi: row.rasyon_tarihi,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseGrup = (obj: any) => ({
  id: obj.id,
  ad: obj.ad,
  tur: obj.tur,
  aciklama: obj.aciklama,
  rasyon_adi: obj.rasyonAdi,
  rasyon_ozet: obj.rasyonOzet,
  rasyon_tarihi: obj.rasyonTarihi,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseYem = (row: any) => ({
  id: row.id,
  ad: row.ad,
  tur: row.tur,
  stokKg: row.stok_kg,
  birimFiyat: row.birim_fiyat,
  sonAlimTarihi: row.son_alim_tarihi,
  tedarikci: row.tedarikci,
  minStokUyariKg: row.min_stok_uyari_kg,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseYem = (obj: any) => ({
  id: obj.id,
  ad: obj.ad,
  tur: obj.tur,
  stok_kg: obj.stokKg,
  birim_fiyat: obj.birimFiyat,
  son_alim_tarihi: obj.sonAlimTarihi,
  tedarikci: obj.tedarikci,
  min_stok_uyari_kg: obj.minStokUyariKg,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseYemHareketi = (row: any) => ({
  id: row.id,
  yemId: row.yem_id,
  islemTuru: row.islem_turu,
  miktarKg: row.miktar_kg,
  islemTarihi: row.islem_tarihi,
  aciklama: row.aciklama,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseYemHareketi = (obj: any) => ({
  id: obj.id,
  yem_id: obj.yemId,
  islem_turu: obj.islemTuru,
  miktar_kg: obj.miktarKg,
  islem_tarihi: obj.islemTarihi,
  aciklama: obj.aciklama,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseSut = (row: any) => ({
  id: row.id,
  hayvanId: row.hayvan_id,
  tarih: row.tarih,
  litre: row.litre,
  yagYuzde: row.yag_yuzde,
  proteinYuzde: row.protein_yuzde,
  laktozYuzde: row.laktoz_yuzde,
  somatikHucre: row.somatik_hucre,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseSut = (obj: any) => ({
  id: obj.id,
  hayvan_id: obj.hayvanId,
  tarih: obj.tarih,
  litre: obj.litre,
  yag_yuzde: obj.yagYuzde,
  protein_yuzde: obj.proteinYuzde,
  laktoz_yuzde: obj.laktozYuzde,
  somatik_hucre: obj.somatikHucre,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseAgirlik = (row: any) => ({
  id: row.id,
  hayvanId: row.hayvan_id,
  tarih: row.tarih,
  kg: row.kg,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseAgirlik = (obj: any) => ({
  id: obj.id,
  hayvan_id: obj.hayvanId,
  tarih: obj.tarih,
  kg: obj.kg,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseSaglik = (row: any) => ({
  id: row.id,
  hayvanId: row.hayvan_id,
  tarih: row.tarih,
  tur: row.tur,
  ilacAdi: row.ilac_adi,
  aciklama: row.aciklama,
  arinmaSuresiGun: row.arinma_suresi_gun,
  maliyet: row.maliyet,
  detaylar: row.detaylar,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseSaglik = (obj: any) => ({
  id: obj.id,
  hayvan_id: obj.hayvanId,
  tarih: obj.tarih,
  tur: obj.tur,
  ilac_adi: obj.ilacAdi,
  aciklama: obj.aciklama,
  arinma_suresi_gun: obj.arinmaSuresiGun,
  maliyet: obj.maliyet,
  detaylar: obj.detaylar,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabasePlanlananAsi = (row: any) => ({
  id: row.id,
  hayvanId: row.hayvan_id,
  hayvanKupeNo: row.hayvan_kupe_no,
  protokolAd: row.protokol_ad,
  asiAd: row.asi_ad,
  planlanaTarih: row.planlana_tarih,
  yapildiMi: row.yapildi_mi,
  yapilmaTarihi: row.yapilma_tarihi,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabasePlanlananAsi = (obj: any) => ({
  id: obj.id,
  hayvan_id: obj.hayvanId,
  hayvan_kupe_no: obj.hayvanKupeNo,
  protokol_ad: obj.protokolAd,
  asi_ad: obj.asiAd,
  planlana_tarih: obj.planlanaTarih,
  yapildi_mi: obj.yapildiMi,
  yapilma_tarihi: obj.yapilmaTarihi,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseEkFinansalIslem = (row: any) => ({
  id: row.id,
  tarih: row.tarih,
  tip: row.tip,
  kategori: row.kategori,
  miktar: row.miktar,
  aciklama: row.aciklama,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseEkFinansalIslem = (obj: any) => ({
  id: obj.id,
  tarih: obj.tarih,
  tip: obj.tip,
  kategori: obj.kategori,
  miktar: obj.miktar,
  aciklama: obj.aciklama,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseGunlukYemMaliyeti = (row: any) => ({
  id: row.id,
  tarih: row.tarih,
  toplamMaliyet: row.toplam_maliyet,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseGunlukYemMaliyeti = (obj: any) => ({
  id: obj.id,
  tarih: obj.tarih,
  toplam_maliyet: obj.toplamMaliyet,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseProtokol = (row: any) => ({
  id: row.id,
  ad: row.ad,
  hedefTur: row.hedef_tur,
  uygulamalar: row.uygulamalar,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseProtokol = (obj: any) => ({
  id: obj.id,
  ad: obj.ad,
  hedef_tur: obj.hedefTur,
  uygulamalar: obj.uygulamalar,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseUreme = (row: any) => ({
  id: row.id,
  hayvanId: row.hayvan_id,
  tarih: row.tarih,
  tur: row.tur,
  durum: row.durum,
  notlar: row.notlar,
  detaylar: row.detaylar,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseUreme = (obj: any) => ({
  id: obj.id,
  hayvan_id: obj.hayvanId,
  tarih: obj.tarih,
  tur: obj.tur,
  durum: obj.durum,
  notlar: obj.notlar,
  detaylar: obj.detaylar,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseBuzagi = (row: any) => ({
  id: row.id,
  hayvanId: row.hayvan_id,
  dogumAgirligiKg: row.dogum_agirligi_kg,
  agizSutuVerildi: row.agiz_sutu_verildi,
  agizSutuMiktarLt: row.agiz_sutu_miktar_lt,
  agizSutuSaatSonra: row.agiz_sutu_saat_sonra,
  hedefSuttenKesimTarihi: row.hedef_sutten_kesim_tarihi,
  hedefSuttenKesimAgirligiKg: row.hedef_sutten_kesim_agirligi_kg,
  gerceklesenSuttenKesimTarihi: row.gerceklesen_sutten_kesim_tarihi,
  gerceklesenSuttenKesimAgirligiKg: row.gerceklesen_sutten_kesim_agirligi_kg,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseBuzagi = (obj: any) => ({
  id: obj.id,
  hayvan_id: obj.hayvanId,
  dogum_agirligi_kg: obj.dogumAgirligiKg,
  agiz_sutu_verildi: obj.agizSutuVerildi,
  agiz_sutu_miktar_lt: obj.agizSutuMiktarLt,
  agiz_sutu_saat_sonra: obj.agizSutuSaatSonra,
  hedef_sutten_kesim_tarihi: obj.hedefSuttenKesimTarihi,
  hedef_sutten_kesim_agirligi_kg: obj.hedefSuttenKesimAgirligiKg,
  gerceklesen_sutten_kesim_tarihi: obj.gerceklesenSuttenKesimTarihi,
  gerceklesen_sutten_kesim_agirligi_kg: obj.gerceklesenSuttenKesimAgirligiKg,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

const mapFromSupabaseSohbet = (row: any) => ({
  id: row.id,
  baslik: row.baslik,
  olusturulmaTarihi: row.olusturulmaTarihi,
  guncellenmeTarihi: row.guncellenmeTarihi,
  mesajlar: row.mesajlar,
  user_id: row.user_id,
  ciftlikId: row.ciftlik_id || undefined
});

const mapToSupabaseSohbet = (obj: any) => ({
  id: obj.id,
  baslik: obj.baslik,
  olusturulmaTarihi: obj.olusturulmaTarihi,
  guncellenmeTarihi: obj.guncellenmeTarihi,
  mesajlar: obj.mesajlar,
  user_id: obj.user_id,
  ciftlik_id: obj.ciftlikId
});

export const pullInitialData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ciftliklerRes = await supabase.from('ciftlikler').select('*').eq('user_id', user.id);
    if (ciftliklerRes.data) {
      const mappedCiftlikler = ciftliklerRes.data.map(row => ({ id: row.id, ad: row.ad, olusturulmaTarihi: row.olusturulma_tarihi, user_id: row.user_id }));
      await db.ciftlikler.bulkPut(mappedCiftlikler);
      useStore.getState().setCiftlikler(mappedCiftlikler);
      // Mobilde activeCiftlikId null ise (localStorage temizlenmiş/yeni cihaz), ilk çiftliği otomatik seç
      if (!useStore.getState().activeCiftlikId && mappedCiftlikler.length > 0) {
        useStore.getState().setActiveCiftlikId(mappedCiftlikler[0].id);
      }
    }

    const [hayvanlarRes, gruplarRes, yemlerRes, yemHareketleriRes, sutRes, agirlikRes, saglikRes, protokolRes, planlananAsilarRes, uremeRes, buzagiRes, sohbetlerRes, ekFinansRes] = await Promise.all([
      supabase.from('hayvanlar').select('*').eq('user_id', user.id),
      supabase.from('gruplar').select('*').eq('user_id', user.id),
      supabase.from('yemler').select('*').eq('user_id', user.id),
      supabase.from('yem_hareketleri').select('*').eq('user_id', user.id),
      supabase.from('sut_kayitlari').select('*').eq('user_id', user.id),
      supabase.from('agirlik_kayitlari').select('*').eq('user_id', user.id),
      supabase.from('saglik_olaylari').select('*').eq('user_id', user.id),
      supabase.from('asi_protokolleri').select('*').eq('user_id', user.id),
      supabase.from('planlanan_asilar').select('*').eq('user_id', user.id),
      supabase.from('ureme_kayitlari').select('*').eq('user_id', user.id),
      supabase.from('buzagi_kayitlari').select('*').eq('user_id', user.id),
      supabase.from('sohbetler').select('*').eq('user_id', user.id),
      supabase.from('ek_finansal_islemler').select('*').eq('user_id', user.id)
    ]);

    if (hayvanlarRes.data) await db.hayvanlar.bulkPut(hayvanlarRes.data.map(mapFromSupabaseHayvan));
    if (gruplarRes.data) await db.gruplar.bulkPut(gruplarRes.data.map(mapFromSupabaseGrup));
    if (yemlerRes.data) await db.yemler.bulkPut(yemlerRes.data.map(mapFromSupabaseYem));
    if (yemHareketleriRes.data) await db.yemHareketleri.bulkPut(yemHareketleriRes.data.map(mapFromSupabaseYemHareketi));
    if (sutRes.data) await db.sutKayitlari.bulkPut(sutRes.data.map(mapFromSupabaseSut));
    if (agirlikRes.data) await db.agirlikKayitlari.bulkPut(agirlikRes.data.map(mapFromSupabaseAgirlik));
    if (saglikRes.data) await db.saglikOlaylari.bulkPut(saglikRes.data.map(mapFromSupabaseSaglik));
    if (protokolRes.data) await db.asiProtokolleri.bulkPut(protokolRes.data.map(mapFromSupabaseProtokol));
    if (planlananAsilarRes.data) await db.planlananAsilar.bulkPut(planlananAsilarRes.data.map(mapFromSupabasePlanlananAsi));
    if (uremeRes.data) await db.uremeKayitlari.bulkPut(uremeRes.data.map(mapFromSupabaseUreme));
    if (buzagiRes.data) await db.buzagiKayitlari.bulkPut(buzagiRes.data.map(mapFromSupabaseBuzagi));
    if (sohbetlerRes.data) await db.sohbetler.bulkPut(sohbetlerRes.data.map(mapFromSupabaseSohbet));
    if (ekFinansRes.data) await db.ekFinansalIslemler.bulkPut(ekFinansRes.data.map(mapFromSupabaseEkFinansalIslem));

    // Yeni tablonun hata verip sync'i bozmasını önlemek için ayrı çekiyoruz
    try {
      const gunlukYemRes = await supabase.from('gunluk_yem_maliyetleri').select('*').eq('user_id', user.id);
      if (gunlukYemRes.data && !gunlukYemRes.error) {
        await db.gunlukYemMaliyetleri.bulkPut(gunlukYemRes.data.map(mapFromSupabaseGunlukYemMaliyeti));
      }
    } catch (e) {
      console.warn('gunluk_yem_maliyetleri tablosu henüz Supabase de oluşturulmamış olabilir.', e);
    }

    try {
      const ayarlarRes = await supabase.from('kullanici_ayarlari').select('ayarlar').eq('user_id', user.id).maybeSingle();
      if (ayarlarRes.data && !ayarlarRes.error) {
        const remoteAyarlar = ayarlarRes.data.ayarlar;
        if (remoteAyarlar) {
          useStore.setState(state => ({
            ...state,
            ...remoteAyarlar
          }));
        }
      }
    } catch (e) {
      console.warn('kullanici_ayarlari tablosu henüz Supabase de oluşturulmamış olabilir.', e);
    }

    console.log('Veriler IndexedDB ye çekildi.');
  } catch (err) {
    console.error('Veri çekme hatası:', err);
  }
};

// Bağımlılık sırası: bağımlı tablolar her zaman parent tablolardan sonra işlenmeli
const TABLE_PRIORITY: Record<string, number> = {
  ciftlikler: 0,
  gruplar: 1,
  hayvanlar: 2,
  yemler: 3,
  yemHareketleri: 4,
  sutKayitlari: 4,
  agirlikKayitlari: 4,
  saglikOlaylari: 4,
  asiProtokolleri: 4,
  planlananAsilar: 5,
  uremeKayitlari: 5,
  buzagiKayitlari: 5,
  sohbetler: 6,
  ekFinansalIslemler: 6,
  gunlukYemMaliyetleri: 6,
};

export const processSyncQueue = async () => {
  if (!navigator.onLine) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const rawQueue = await db.syncQueue.orderBy('created_at').toArray();
  if (rawQueue.length === 0) return;

  // Bağımlılık sırasına göre sırala (aynı öncelik için oluşturulma zamanına göre)
  const queue = rawQueue.sort((a, b) => {
    const pa = TABLE_PRIORITY[a.table] ?? 10;
    const pb = TABLE_PRIORITY[b.table] ?? 10;
    return pa !== pb ? pa - pb : a.created_at - b.created_at;
  });

  for (const op of queue) {
    try {
      let recordPayload: any = { ...op.payload, user_id: user.id };
      
      const mapToSupabase: Record<string, (obj: any) => any> = {
        hayvanlar: mapToSupabaseHayvan,
        gruplar: mapToSupabaseGrup,
        yemler: mapToSupabaseYem,
        yemHareketleri: mapToSupabaseYemHareketi,
        sutKayitlari: mapToSupabaseSut,
        agirlikKayitlari: mapToSupabaseAgirlik,
        saglikOlaylari: mapToSupabaseSaglik,
        asiProtokolleri: mapToSupabaseProtokol,
        planlananAsilar: mapToSupabasePlanlananAsi,
        uremeKayitlari: mapToSupabaseUreme,
        buzagiKayitlari: mapToSupabaseBuzagi,
        sohbetler: mapToSupabaseSohbet,
        ekFinansalIslemler: mapToSupabaseEkFinansalIslem,
        gunlukYemMaliyetleri: mapToSupabaseGunlukYemMaliyeti
      };

      const tableMap: Record<string, string> = {
        hayvanlar: 'hayvanlar',
        gruplar: 'gruplar',
        yemler: 'yemler',
        yemHareketleri: 'yem_hareketleri',
        sutKayitlari: 'sut_kayitlari',
        agirlikKayitlari: 'agirlik_kayitlari',
        saglikOlaylari: 'saglik_olaylari',
        asiProtokolleri: 'asi_protokolleri',
        planlananAsilar: 'planlanan_asilar',
        uremeKayitlari: 'ureme_kayitlari',
        buzagiKayitlari: 'buzagi_kayitlari',
        sohbetler: 'sohbetler',
        ekFinansalIslemler: 'ek_finansal_islemler',
        gunlukYemMaliyetleri: 'gunluk_yem_maliyetleri'
      };

      const mapFunc = mapToSupabase[op.table];
      const tableName = tableMap[op.table] || op.table;

      if (mapFunc) {
        recordPayload = mapFunc(recordPayload);
      }
      if (op.action === 'INSERT') {
        const { error } = await supabase.from(tableName).insert(recordPayload);
        if (error) throw error;
      } else if (op.action === 'UPDATE') {
        const { error } = await supabase.from(tableName).update(recordPayload).eq('id', op.payload.id);
        if (error) throw error;
      } else if (op.action === 'DELETE') {
        const { error } = await supabase.from(tableName).delete().eq('id', op.payload.id);
        if (error) throw error;
      }

      if (op.id) {
        await db.syncQueue.delete(op.id);
      }
    } catch (err) {
      console.error('Senkronizasyon hatası:', err);
      // Hata durumunda sadece bu öğeyi atla, diğerlerini eşitlemeye devam et
      continue;
    }
  }
};
