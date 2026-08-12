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
  olumTarihi?: string;
  olumNedeniTipi?: 'Hastalık' | 'Kaza / Travma' | 'Zehirlenme' | 'Güç Doğum' | 'Yaşlılık' | 'Diğer';
  olumNedeniDetay?: string;
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
  rasyonOzet?: string; // { yemId: kg_miktari } gibi bir string özet
  rasyonTarihi?: string; // Atanma veya güncellenme tarihi
  
  // Faz 7.3 Rasyon Versiyonlama
  rasyonTarihcesi?: Array<{
    tarih: string;
    rasyonAdi: string;
    rasyonOzet: string;
  }>;
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
  ogun?: 'Sabah' | 'Öğle' | 'Akşam' | 'Gece';
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
  hastalikAdi?: string;
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

export interface HayvanGunlukYemMaliyeti {
  ciftlikId?: string;
  id: string;
  hayvanId: string;
  tarih: string; // YYYY-MM-DD
  maliyet: number;
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

// ─── Anomali & Uyarı Sistemi ───────────────────────────────────────────────

export type UyariTipi =
  | 'SUT_DUSUS'          // Süt verimi ani düşüşü (kayan ortalama karşılaştırması)
  | 'AGIRLIK_SAPMA'      // Ağırlık büyüme sapması (beklenen ADG'den)
  | 'UREME_GECIKME'      // Doğum sonrası tohumlama süresi aşıldı
  | 'LAKTASYON_UZADI'    // Laktasyon süresi normalin üzerinde (kuru kayıt yok)
  | 'KIZGINLIK_BEKLIYOR' // Kızgınlık dönemine girdi ama kayıt girilmedi
  | 'KURUYA_CIKARMA_GECIKTI' // Gebelik kontrolü 'Gebe' ise ve kuruya çıkarma tarihi geçtiyse
  | 'YUKSEK_SOMATIK_HUCRE'   // SCC > 400.000 → mastitis riski
  | 'NEGATIF_ADG'             // Son 2 ölçüm arası kilo kaybı
  | 'YUKSEK_SAGLIK_MALIYETI'  // 30 gün maliyet > sürü ort. × 2
  | 'KURU_DONEM_BESLEME';     // Kuruya çıkarma tarihi 14 gün kala

export type UyariSiddeti = 'DUSUK' | 'ORTA' | 'KRITIK';

export interface UyariItem {
  /** hayvanId + '_' + tip kombinasyonundan türetilen benzersiz anahtar */
  id: string;
  hayvanId: string;
  hayvanKupeNo: string;
  tip: UyariTipi;
  siddet: UyariSiddeti;
  /** Kullanıcıya gösterilecek kısa açıklama */
  mesaj: string;
  /** Opsiyonel ek detay (örn. kaç gün geciktiği) */
  detay?: string;
  /** Uyarının hesaplandığı tarih */
  tarih: Date;
  /** Tıklanınca yönlendirilecek route (örn. '/ureme', '/hayvanlar?id=...') */
  linkTo?: string;
}

export interface Todo {
  ciftlikId?: string;
  id: string;
  metin: string;
  yapildiMi: boolean;
  olusturulmaTarihi: number;
  tamamlanmaTarihi?: number;
  
  // Otomasyon ve Akıllı Görev Listesi (Faz 5) eklentileri:
  isSystem?: boolean; // Sistem tarafından otomatik mi oluşturuldu?
  hedefTarih?: string; // YYYY-MM-DD (Görevin yapılacağı gün)
  ilgiliHayvanId?: string; // Eğer bir hayvanla bağlantılıysa (Tıklayınca o hayvana gitmek için)
  priority?: 'Kritik' | 'Önemli' | 'Rutin'; 
  kategori?: 'Üreme' | 'Sağlık' | 'Genel' | 'Besleme';
}

export interface GunlukNotu {
  id: string;
  ciftlikId?: string;
  tarih: string; // YYYY-MM-DD
  metin: string;
  olusturulmaTarihi: number;
  medyalar?: string[];
  etiketler?: string[];
}

// ─── Genetik Analiz & Islah Modülü ───────────────────────────────────────────────

export interface SkorDetay {
  hamDeger: number;
  cevreselDuzeltme: number;
  duzeltilmisDeger: number;
  h2Katsayisi: number;
  genetikTahmin: number;
  normalizedSkor: number; // 0-100
  guvenilirlik: number;   // 0-100 (veri yeterliliği)
  veriSayisi: number;
}

export interface TDI {
  hayvanId: string;
  sutSkoru?: SkorDetay;
  buyumeSkoru: SkorDetay;
  saglikSkoru: SkorDetay;
  fertiliteSkor?: SkorDetay;
  dogumKolayligi?: SkorDetay;
  genelIndeks: number;
  genelGuvenilirlik: number;
  hesaplamaTarihi: string;
  isletmeTipi: 'Süt' | 'Besi' | 'Karma';
}

export interface SpermaKaydi {
  id: string;
  ciftlikId?: string;
  bogaAdi: string;
  irk?: string;
  sirket?: string;
  stokMiktari: number;
  katalogDegerleri?: Record<string, any>;
}

export interface PlanlananCiftlesme {
  id: string;
  ciftlikId?: string;
  disiHayvanId: string;
  erkekHayvanId?: string;
  spermaId?: string;
  planlananTarih: string;
  hedefOzellikler?: string;
  akrabalikKatsayisi?: number;
  tahminDogumTarihi?: string;
  durum: 'Planlandı' | 'Gerçekleşti' | 'İptal';
  notlar?: string;
}

export interface ProgenyTestResult {
  bogaId: string;
  isVirtualSperm: boolean; // True ise Sperma tablosundan, false ise Hayvanlar tablosundan
  bogaAdi: string;
  irk: string;
  yavruSayisi: number;
  guvenilirlik: number; // %0-100
  yavruOrtalamaSut?: number; // Kg/Litre
  yavruOrtalamaSutSapma?: number; // Sürü ortalamasından sapma (+/-)
  yavruOrtalamaCanliAgirlik?: number; 
  yavruOrtalamaCanliAgirlikSapma?: number;
  yavruOrtalamaUremeSkoru?: number;
  // İhtiyaca göre diğer metrikler eklenebilir
}

