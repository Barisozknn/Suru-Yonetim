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
