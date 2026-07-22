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
