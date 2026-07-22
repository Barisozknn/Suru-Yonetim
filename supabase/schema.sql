-- =============================================================
-- SürüMetri - Veritabanı Şeması
-- Supabase SQL Editor > New Query'ye yapıştırın ve Run'a basın
-- Bu script tüm tabloları, RLS politikalarını ve ilişkileri oluşturur.
-- =============================================================

-- ---------------------------------------------------------------
-- ADIM 1: Mevcut tabloları doğru sırada sil (bağımlı önce)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS public.gunluk_yem_maliyetleri CASCADE;
DROP TABLE IF EXISTS public.ek_finansal_islemler CASCADE;
DROP TABLE IF EXISTS public.sohbetler CASCADE;
DROP TABLE IF EXISTS public.buzagi_kayitlari CASCADE;
DROP TABLE IF EXISTS public.ureme_kayitlari CASCADE;
DROP TABLE IF EXISTS public.planlanan_asilar CASCADE;
DROP TABLE IF EXISTS public.asi_protokolleri CASCADE;
DROP TABLE IF EXISTS public.saglik_olaylari CASCADE;
DROP TABLE IF EXISTS public.agirlik_kayitlari CASCADE;
DROP TABLE IF EXISTS public.sut_kayitlari CASCADE;
DROP TABLE IF EXISTS public.yem_hareketleri CASCADE;
DROP TABLE IF EXISTS public.yemler CASCADE;
DROP TABLE IF EXISTS public.hayvanlar CASCADE;
DROP TABLE IF EXISTS public.gruplar CASCADE;
DROP TABLE IF EXISTS public.ciftlikler CASCADE;
DROP TABLE IF EXISTS public.kullanici_ayarlari CASCADE;

-- ---------------------------------------------------------------
-- ADIM 2: Tabloları doğru sırada oluştur
-- ---------------------------------------------------------------

-- 1. Çiftlikler
CREATE TABLE public.ciftlikler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    olusturulma_tarihi TIMESTAMPTZ DEFAULT now()
);

-- 2. Gruplar
CREATE TABLE public.gruplar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad TEXT NOT NULL,
    tur TEXT NOT NULL,
    aciklama TEXT,
    rasyon_adi TEXT,
    rasyon_ozet JSONB,
    rasyon_tarihi TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Hayvanlar
CREATE TABLE public.hayvanlar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kupe_no TEXT NOT NULL,
    tur TEXT NOT NULL,
    irk TEXT NOT NULL,
    dogum_tarihi TEXT,
    cinsiyet TEXT NOT NULL,
    guncel_agirlik_kg NUMERIC DEFAULT 0,
    durum TEXT NOT NULL,
    grup_id UUID REFERENCES public.gruplar(id) ON DELETE SET NULL,
    anne_kupe_no TEXT,
    baba_kupe_no TEXT,
    fotograf_url TEXT,
    notlar TEXT,
    satis_fiyati NUMERIC,
    satis_tarihi TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Yemler
CREATE TABLE public.yemler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad TEXT NOT NULL,
    tur TEXT NOT NULL,
    stok_kg NUMERIC DEFAULT 0,
    birim_fiyat NUMERIC DEFAULT 0,
    son_alim_tarihi TEXT,
    tedarikci TEXT,
    min_stok_uyari_kg NUMERIC DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Yem Hareketleri
CREATE TABLE public.yem_hareketleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yem_id UUID REFERENCES public.yemler(id) ON DELETE CASCADE,
    islem_turu TEXT NOT NULL,
    miktar_kg NUMERIC NOT NULL,
    islem_tarihi TEXT,
    aciklama TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Süt Kayıtları
CREATE TABLE public.sut_kayitlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hayvan_id UUID REFERENCES public.hayvanlar(id) ON DELETE CASCADE,
    tarih TEXT NOT NULL,
    litre NUMERIC NOT NULL,
    yag_yuzde NUMERIC,
    protein_yuzde NUMERIC,
    laktoz_yuzde NUMERIC,
    somatik_hucre NUMERIC,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Ağırlık Kayıtları
CREATE TABLE public.agirlik_kayitlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hayvan_id UUID REFERENCES public.hayvanlar(id) ON DELETE CASCADE,
    tarih TEXT NOT NULL,
    kg NUMERIC NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Sağlık Olayları
CREATE TABLE public.saglik_olaylari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hayvan_id UUID REFERENCES public.hayvanlar(id) ON DELETE CASCADE,
    tarih TEXT NOT NULL,
    tur TEXT NOT NULL,
    ilac_adi TEXT,
    aciklama TEXT,
    arinma_suresi_gun INTEGER DEFAULT 0,
    maliyet NUMERIC,
    detaylar JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Aşı Protokolleri
CREATE TABLE public.asi_protokolleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad TEXT NOT NULL,
    hedef_tur TEXT NOT NULL,
    uygulamalar JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Planlanan Aşılar
CREATE TABLE public.planlanan_asilar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hayvan_id UUID REFERENCES public.hayvanlar(id) ON DELETE CASCADE,
    hayvan_kupe_no TEXT,
    protokol_ad TEXT,
    asi_ad TEXT NOT NULL,
    planlana_tarih TEXT NOT NULL,
    yapildi_mi BOOLEAN DEFAULT false,
    yapilma_tarihi TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Üreme Kayıtları
CREATE TABLE public.ureme_kayitlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hayvan_id UUID REFERENCES public.hayvanlar(id) ON DELETE CASCADE,
    tarih TEXT NOT NULL,
    tur TEXT NOT NULL,
    durum TEXT,
    notlar TEXT,
    detaylar JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Buzağı Kayıtları
CREATE TABLE public.buzagi_kayitlari (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hayvan_id UUID REFERENCES public.hayvanlar(id) ON DELETE CASCADE UNIQUE,
    dogum_agirligi_kg NUMERIC,
    agiz_sutu_verildi BOOLEAN DEFAULT false,
    agiz_sutu_miktar_lt NUMERIC,
    agiz_sutu_saat_sonra NUMERIC,
    hedef_sutten_kesim_tarihi TEXT,
    hedef_sutten_kesim_agirligi_kg NUMERIC,
    gerceklesen_sutten_kesim_tarihi TEXT,
    gerceklesen_sutten_kesim_agirligi_kg NUMERIC,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. AI Sohbetler
CREATE TABLE public.sohbetler (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    baslik TEXT NOT NULL,
    "olusturulmaTarihi" BIGINT NOT NULL,
    "guncellenmeTarihi" BIGINT NOT NULL,
    mesajlar JSONB NOT NULL DEFAULT '[]'::jsonb,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL
);

-- 14. Ek Finansal İşlemler
CREATE TABLE public.ek_finansal_islemler (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarih TEXT NOT NULL,
    tip TEXT NOT NULL,
    kategori TEXT,
    miktar NUMERIC NOT NULL,
    aciklama TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Günlük Yem Maliyetleri
CREATE TABLE public.gunluk_yem_maliyetleri (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarih TEXT NOT NULL,
    toplam_maliyet NUMERIC NOT NULL DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ciftlik_id UUID REFERENCES public.ciftlikler(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Kullanıcı Ayarları
CREATE TABLE public.kullanici_ayarlari (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ayarlar JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------
-- ADIM 3: Tüm tablolarda RLS aktifleştir
-- ---------------------------------------------------------------
ALTER TABLE public.ciftlikler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gruplar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hayvanlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yemler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yem_hareketleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sut_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agirlik_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saglik_olaylari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asi_protokolleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planlanan_asilar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ureme_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buzagi_kayitlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sohbetler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ek_finansal_islemler ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gunluk_yem_maliyetleri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kullanici_ayarlari ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- ADIM 4: RLS Politikaları
-- ---------------------------------------------------------------
CREATE POLICY "ciftlikler_all" ON public.ciftlikler USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gruplar_all" ON public.gruplar USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hayvanlar_all" ON public.hayvanlar USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "yemler_all" ON public.yemler USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "yem_hareketleri_all" ON public.yem_hareketleri USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sut_kayitlari_all" ON public.sut_kayitlari USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agirlik_kayitlari_all" ON public.agirlik_kayitlari USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saglik_olaylari_all" ON public.saglik_olaylari USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "asi_protokolleri_all" ON public.asi_protokolleri USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planlanan_asilar_all" ON public.planlanan_asilar USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ureme_kayitlari_all" ON public.ureme_kayitlari USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "buzagi_kayitlari_all" ON public.buzagi_kayitlari USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sohbetler_all" ON public.sohbetler USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ek_finansal_islemler_all" ON public.ek_finansal_islemler USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gunluk_yem_maliyetleri_all" ON public.gunluk_yem_maliyetleri USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kullanici_ayarlari_select" ON public.kullanici_ayarlari FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "kullanici_ayarlari_insert" ON public.kullanici_ayarlari FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kullanici_ayarlari_update" ON public.kullanici_ayarlari FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- ADIM 5: Hesap silme fonksiyonu
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

-- ---------------------------------------------------------------
-- ADIM 6: Şema önbelleğini yenile
-- ---------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- Tamamlandı! 16 tablo + RLS + politikalar oluşturuldu.

-- =============================================================
-- SürüMetri — Realtime Senkronizasyon Etkinleştirme
-- =============================================================
-- Bu scripti Supabase Dashboard > SQL Editor > New Query'ye
-- yapıştırıp çalıştırın.
--
-- Ne yapar?
--   1. Tüm tablolara REPLICA IDENTITY FULL ekler (DELETE eventlerinde
--      eski satır verisini taşıması için gerekli)
--   2. Tabloları supabase_realtime publication'ına ekler
--      (Realtime kanallarının bu tabloları dinleyebilmesi için gerekli)
-- =============================================================

-- ADIM 1: Replica Identity ayarla (DELETE için eski row'u gönder)
ALTER TABLE public.ciftlikler           REPLICA IDENTITY FULL;
ALTER TABLE public.hayvanlar            REPLICA IDENTITY FULL;
ALTER TABLE public.gruplar              REPLICA IDENTITY FULL;
ALTER TABLE public.yemler               REPLICA IDENTITY FULL;
ALTER TABLE public.yem_hareketleri      REPLICA IDENTITY FULL;
ALTER TABLE public.sut_kayitlari        REPLICA IDENTITY FULL;
ALTER TABLE public.agirlik_kayitlari    REPLICA IDENTITY FULL;
ALTER TABLE public.saglik_olaylari      REPLICA IDENTITY FULL;
ALTER TABLE public.asi_protokolleri     REPLICA IDENTITY FULL;
ALTER TABLE public.planlanan_asilar     REPLICA IDENTITY FULL;
ALTER TABLE public.ureme_kayitlari      REPLICA IDENTITY FULL;
ALTER TABLE public.buzagi_kayitlari     REPLICA IDENTITY FULL;
ALTER TABLE public.sohbetler            REPLICA IDENTITY FULL;
ALTER TABLE public.ek_finansal_islemler REPLICA IDENTITY FULL;
ALTER TABLE public.gunluk_yem_maliyetleri REPLICA IDENTITY FULL;

-- ADIM 2: Tabloları Realtime publication'ına ekle
-- (Supabase'de varsayılan olarak "supabase_realtime" adlı publication kullanılır)
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.ciftlikler,
  public.hayvanlar,
  public.gruplar,
  public.yemler,
  public.yem_hareketleri,
  public.sut_kayitlari,
  public.agirlik_kayitlari,
  public.saglik_olaylari,
  public.asi_protokolleri,
  public.planlanan_asilar,
  public.ureme_kayitlari,
  public.buzagi_kayitlari,
  public.sohbetler,
  public.ek_finansal_islemler,
  public.gunluk_yem_maliyetleri;

-- Tamamlandı! Realtime artık tüm tablolar için aktif.
-- Uygulama açık olduğu sürece mobil ↔ masaüstü değişiklikler anında yansır.

-- =============================================================
-- SürüMetri — Hesap Silme (delete_user) Fonksiyonu
-- =============================================================
-- Bu scripti Supabase Dashboard > SQL Editor > New Query'ye
-- yapıştırıp çalıştırın.
--
-- Ne yapar?
--   Kullanıcının uygulamanın "Ayarlar" sekmesinden kendi
--   hesabını kalıcı olarak silmesini sağlar. Güvenlik
--   sebebiyle bu özel olarak tanımlanması gereken bir RPC'dir.
-- =============================================================

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Güvenlik kontrolü: sadece giriş yapmış kullanıcılar kendi hesabını silebilir
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Oturum açık değil';
  END IF;

  -- auth.users tablosundan silindiğinde, CASCADE tanımlıysa
  -- public tablolarındaki kullanıcının tüm verileri de otomatik silinir.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- =============================================================
-- SürüMetri — Yem Besin Değerleri Sütunları Ekleme
-- =============================================================
-- Bu scripti Supabase Dashboard > SQL Editor > New Query'ye
-- yapıştırıp çalıştırın.
--
-- Ne yapar?
--   1. yemler tablosuna Rasyon Hesaplama için gereken 
--      besin değerleri sütunlarını ekler.
-- =============================================================

ALTER TABLE public.yemler
ADD COLUMN IF NOT EXISTS km_yuzde NUMERIC,
ADD COLUMN IF NOT EXISTS me_mcal_kg NUMERIC,
ADD COLUMN IF NOT EXISTS hp_yuzde NUMERIC,
ADD COLUMN IF NOT EXISTS ca_yuzde NUMERIC,
ADD COLUMN IF NOT EXISTS p_yuzde NUMERIC;

