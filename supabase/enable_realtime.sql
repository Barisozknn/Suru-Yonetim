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
