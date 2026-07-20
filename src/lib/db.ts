import { useStore } from '../store/useStore';
import Dexie, { type Table } from 'dexie';
import type { Hayvan, Grup, Yem, YemHareketi, SutKaydi, AgirlikKaydi, SaglikOlayi, AsiProtokolu, PlanlananAsi, UremeKaydi, BuzagiKaydi, Sohbet, EkFinansalIslem, GunlukYemMaliyeti } from '../types';

export interface SyncOperation {
  id?: number;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  created_at: number;
}

export class SuruYonetimDB extends Dexie {
  ciftlikler!: Table<import('../types').Ciftlik, string>;
  hayvanlar!: Table<Hayvan, string>;
  gruplar!: Table<Grup, string>;
  yemler!: Table<Yem, string>;
  yemHareketleri!: Table<YemHareketi, string>;
  sutKayitlari!: Table<SutKaydi, string>;
  agirlikKayitlari!: Table<AgirlikKaydi, string>;
  saglikOlaylari!: Table<SaglikOlayi, string>;
  asiProtokolleri!: Table<AsiProtokolu, string>;
  planlananAsilar!: Table<PlanlananAsi, string>;
  uremeKayitlari!: Table<UremeKaydi, string>;
  buzagiKayitlari!: Table<BuzagiKaydi, string>;
  sohbetler!: Table<Sohbet, string>;
  ekFinansalIslemler!: Table<EkFinansalIslem, string>;
  gunlukYemMaliyetleri!: Table<GunlukYemMaliyeti, string>;
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('SuruYonetimDB');

    

    this.version(10).stores({
      ciftlikler: 'id, ad',
      hayvanlar: 'id, ciftlikId, kupeNo, tur, irk, durum, grupId',
      gruplar: 'id, ciftlikId, ad, tur',
      yemler: 'id, ciftlikId, ad, tur',
      yemHareketleri: 'id, ciftlikId, yemId, islemTarihi',
      sutKayitlari: 'id, ciftlikId, hayvanId, tarih',
      agirlikKayitlari: 'id, ciftlikId, hayvanId, tarih',
      saglikOlaylari: 'id, ciftlikId, hayvanId, tarih, tur',
      asiProtokolleri: 'id, ciftlikId, ad, hedefTur',
      planlananAsilar: 'id, ciftlikId, hayvanId, planlanaTarih, yapildiMi',
      uremeKayitlari: 'id, ciftlikId, hayvanId, tarih, tur',
      buzagiKayitlari: 'id, ciftlikId, hayvanId',
      sohbetler: 'id, ciftlikId, olusturulmaTarihi, guncellenmeTarihi',
      ekFinansalIslemler: 'id, ciftlikId, tarih, tip, kategori',
      gunlukYemMaliyetleri: 'id, ciftlikId, tarih',
      syncQueue: '++id, ciftlikId, table, created_at'
    });

    this.version(9).stores({
      hayvanlar: 'id, kupeNo, tur, irk, durum, grupId',
      gruplar: 'id, ad, tur',
      yemler: 'id, ad, tur',
      yemHareketleri: 'id, yemId, islemTarihi',
      sutKayitlari: 'id, hayvanId, tarih',
      agirlikKayitlari: 'id, hayvanId, tarih',
      saglikOlaylari: 'id, hayvanId, tarih, tur',
      asiProtokolleri: 'id, ad, hedefTur',
      planlananAsilar: 'id, hayvanId, planlanaTarih, yapildiMi',
      uremeKayitlari: 'id, hayvanId, tarih, tur',
      buzagiKayitlari: 'id, hayvanId',
      sohbetler: 'id, olusturulmaTarihi, guncellenmeTarihi',
      ekFinansalIslemler: 'id, tarih, tip, kategori',
      gunlukYemMaliyetleri: 'id, tarih',
      syncQueue: '++id, table, created_at'
    });

    this.version(6).stores({
      hayvanlar: 'id, kupeNo, tur, irk, durum, grupId',
      gruplar: 'id, ad, tur',
      yemler: 'id, ad, tur',
      yemHareketleri: 'id, yemId, islemTarihi',
      sutKayitlari: 'id, hayvanId, tarih',
      agirlikKayitlari: 'id, hayvanId, tarih',
      saglikOlaylari: 'id, hayvanId, tarih, tur',
      asiProtokolleri: 'id, ad, hedefTur',
      planlananAsilar: 'id, hayvanId, planlanaTarih, yapildiMi',
      uremeKayitlari: 'id, hayvanId, tarih, tur',
      buzagiKayitlari: 'id, hayvanId',
      syncQueue: '++id, table, action, created_at'
    });

    this.version(5).stores({
      hayvanlar: 'id, kupeNo, tur, irk, durum, grupId',
      gruplar: 'id, ad, tur',
      yemler: 'id, ad, tur',
      yemHareketleri: 'id, yemId, islemTarihi',
      sutKayitlari: 'id, hayvanId, tarih',
      agirlikKayitlari: 'id, hayvanId, tarih',
      saglikOlaylari: 'id, hayvanId, tarih, tur',
      asiProtokolleri: 'id, ad, hedefTur',
      planlananAsilar: 'id, hayvanId, planlanaTarih, yapildiMi',
      uremeKayitlari: 'id, hayvanId, tarih, tur',
      syncQueue: '++id, table, action, created_at'
    });

    this.version(4).stores({
      hayvanlar: 'id, kupeNo, tur, irk, durum, grupId',
      gruplar: 'id, ad, tur',
      yemler: 'id, ad, tur',
      yemHareketleri: 'id, yemId, islemTarihi',
      sutKayitlari: 'id, hayvanId, tarih',
      agirlikKayitlari: 'id, hayvanId, tarih',
      saglikOlaylari: 'id, hayvanId, tarih, tur',
      asiProtokolleri: 'id, ad, hedefTur',
      planlananAsilar: 'id, hayvanId, planlanaTarih, yapildiMi',
      syncQueue: '++id, table, action, created_at'
    });

    this.version(3).stores({
      hayvanlar: 'id, kupeNo, tur, irk, durum, grupId',
      gruplar: 'id, ad, tur',
      yemler: 'id, ad, tur',
      yemHareketleri: 'id, yemId, islemTarihi',
      sutKayitlari: 'id, hayvanId, tarih',
      agirlikKayitlari: 'id, hayvanId, tarih',
      syncQueue: '++id, table, action, created_at'
    });

    this.version(2).stores({
      hayvanlar: 'id, kupeNo, tur, irk, durum, grupId, anneKupeNo, babaKupeNo'
    });

    
  }
}

export const db = new SuruYonetimDB();

const tables = ['hayvanlar', 'gruplar', 'yemler', 'yemHareketleri', 'sutKayitlari', 'agirlikKayitlari', 'saglikOlaylari', 'asiProtokolleri', 'planlananAsilar', 'uremeKayitlari', 'buzagiKayitlari', 'sohbetler', 'ekFinansalIslemler', 'gunlukYemMaliyetleri'];

db.tables.forEach(table => {
  if (tables.includes(table.name)) {
    table.hook('creating', function (_primKey, obj, _trans) {
      const activeId = useStore.getState().activeCiftlikId;
      if (activeId && !obj.ciftlikId) {
        obj.ciftlikId = activeId;
      }
    });
  }
});