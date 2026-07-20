export interface Hayvan {
  ciftlikId?: string;
  id: string;
  kupeNo: string;
  tur: 'İnek' | 'Tosun' | 'Boğa' | 'Öküz' | 'Düve' | 'Dana' | 'Buzağı';
  irk: string;
  dogumTarihi: string;
  cinsiyet: 'Erkek' | 'Dişi';
  guncelAgirlikKg: number;
  grupId: string | null;
  durum: 'Aktif' | 'Satıldı' | 'Öldü';
  anneKupeNo?: string;
  babaKupeNo?: string;
  fotografUrl?: string;
  notlar?: string;
  kisirlastirildiMi?: boolean;
  satisFiyati?: number;
  satisTarihi?: string;
}

export interface Grup {
  ciftlikId?: string;
  id: string;
  ad: string;
  tur: 'İnek' | 'Tosun' | 'Boğa' | 'Öküz' | 'Düve' | 'Dana' | 'Buzağı' | 'Karma';
  aciklama?: string;
  hayvanSayisi?: number;
  rasyonAdi?: string;
  rasyonOzet?: string;
  rasyonTarihi?: string;
}

export interface Yem {
  ciftlikId?: string;
  id: string;
  ad: string;
  tur: string;
  stokKg: number;
  birimFiyat: number;
  sonAlimTarihi?: string;
  tedarikci?: string;
  minStokUyariKg: number;
  kmYuzde?: number;
  meMcalKg?: number;
  hpYuzde?: number;
  caYuzde?: number;
  pYuzde?: number;
}

export interface YemHareketi {
  ciftlikId?: string;
  id: string;
  yemId: string;
  islemTuru: 'GİRİŞ' | 'ÇIKIŞ';
  miktarKg: number;
  islemTarihi: string;
  aciklama?: string;
}

export interface SutKaydi {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  tarih: string;
  litre: number;
  yagYuzde?: number;
  proteinYuzde?: number;
  laktozYuzde?: number;
  somatikHucre?: number;
}

export interface AgirlikKaydi {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  tarih: string;
  kg: number;
}

export type SaglikOlayiTur = 'Muayene' | 'Aşı' | 'İlaç' | 'Operasyon' | 'Diğer';

export interface SaglikOlayi {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  tarih: string;
  tur: SaglikOlayiTur;
  ilacAdi?: string;
  aciklama: string;
  arinmaSuresiGun: number;
  maliyet?: number;
  detaylar?: Record<string, any>;
}

export interface AsiUygulama {
  ciftlikId?: string;
  ad: string;
  gunFarki: number; // doğum tarihinden kaç gün sonra
  tekrarGun?: number; // kaç günde bir tekrarlanacağı (opsiyonel)
  tekrarSayisi?: number; // kaç kez tekrar edileceği
  surekliTekrar?: boolean; // hayvanın ömrü boyunca (sabit limit) devam eder mi
  maliyet?: number; // Tekrar başına maliyet
}

export interface AsiProtokolu {
  ciftlikId?: string;
  id: string;
  ad: string;
  hedefTur: 'İnek' | 'Tosun' | 'Boğa' | 'Öküz' | 'Düve' | 'Dana' | 'Buzağı' | 'Tümü';
  uygulamalar: AsiUygulama[];
}

export interface PlanlananAsi {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  hayvanKupeNo: string;
  protokolAd: string;
  asiAd: string;
  planlanaTarih: string; // ISO date string
  yapildiMi: boolean;
  yapilmaTarihi?: string;
  maliyet?: number;
}

export type UremeKaydiTur = 'Kızgınlık' | 'Tohumlama/Aşım' | 'Gebelik Kontrolü' | 'Kuruya Çıkarma' | 'Doğum' | 'Doğal Aşım' | 'Sperma Alımı' | 'Damızlık Muayenesi';

export interface UremeKaydi {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  tarih: string;
  tur: UremeKaydiTur;
  durum?: 'Gebe' | 'Boş' | 'Belirsiz'; // Gebelik kontrolü için
  maliyet?: number;
  notlar?: string;
  detaylar?: {
    gozlemYontemi?: string;
    spermaBogaBilgisi?: string;
    teknisyen?: string;
    [key: string]: any;
  };
}

export interface BuzagiKaydi {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  dogumDegerlendirmesi?: 'Sağlıklı' | 'Güç Doğum' | 'Ölü Doğum' | 'Düşük';
  dogumAgirligiKg?: number;
  agizSutuVerildi: boolean;
  agizSutuMiktarLt?: number;
  agizSutuSaatSonra?: number;
  hedefSuttenKesimTarihi?: string;
  hedefSuttenKesimAgirligiKg?: number;
  gerceklesenSuttenKesimTarihi?: string;
  gerceklesenSuttenKesimAgirligiKg?: number;
}

export interface Mesaj {
  ciftlikId?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: number;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface Sohbet {
  ciftlikId?: string;
  id: string;
  baslik: string;
  olusturulmaTarihi: number;
  guncellenmeTarihi: number;
  mesajlar: Mesaj[];
}

export interface EkFinansalIslem {
  ciftlikId?: string;
  id: string;
  tarih: string; // ISO string
  tip: 'Gelir' | 'Gider';
  kategori: 'Süt Satışı' | 'Hayvan Satışı' | 'Yem Gideri' | 'Sağlık Gideri' | 'Üreme Gideri' | 'Ek Gelir' | 'Ek Gider';
  miktar: number;
  aciklama?: string;
}

export interface GunlukYemMaliyeti {
  ciftlikId?: string;
  id: string;
  tarih: string; // ISO date format YYYY-MM-DD
  toplamMaliyet: number;
}


export interface Ciftlik {
  id: string;
  ad: string;
  olusturulmaTarihi: string;
  user_id?: string;
}
