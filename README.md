# Sürü Yönetim Uygulaması

Bu proje, süt ve besi sığırcılığı işletmeleri için geliştirilmiş, kapsamlı ve modern bir sürü yönetim uygulamasıdır. İçerisinde hayvan takibi, soy ağacı, sağım ve ağırlık kayıtları, yem deposu ve rasyon planlama gibi birçok gelişmiş modül bulunmaktadır.

## Özellikler
- **Hayvan Yönetimi:** Küpe no, cinsiyet, ırk, doğum tarihi ve ebeveyn kayıtları ile sürü takibi.
- **Soy Ağacı:** 3 nesil boyunca ebeveyn-yavru ilişkilerini görüntüleyebilme.
- **Yem Deposu & Rasyon:** Yem stok yönetimi, fiyat ve besin değerleri takibi (KM, ME, HP vb.) ve otomatik hedef rasyon hesaplama.
- **Süt ve Ağırlık Takibi:** Laktasyon kayıtları, süt grafikleri ve canlı ağırlık/ADG hesaplamaları.
- **Sağlık & Üreme:** Aşı ve tedavi kayıtları, kuruya çıkarma, tohumlama ve gebelik bildirimleri.
- **Offline Çalışma:** Dexie.js (IndexedDB) mimarisi ile veri senkronizasyonu.
- **AI Asistanı:** Sürü istatistiklerini analiz edebilen yapay zeka entegrasyonu.
- **Dışa/İçe Aktarım:** Kayıtların PDF ve Excel (XLSX) formatlarında çıktı alınması ve şablon aracılığıyla toplu veri yüklenmesi.

## Teknolojiler
- **Frontend:** React, TypeScript, Vite
- **Stil & UI:** Tailwind CSS, Lucide React (İkonlar), Recharts (Grafikler)
- **Durum Yönetimi:** Zustand
- **Veritabanı & Backend:** Supabase (Auth, Postgres, Edge Functions)
- **Yerel Depolama (Offline First):** Dexie.js (IndexedDB)
- **PDF & Excel İşlemleri:** jsPDF, jspdf-autotable, xlsx

## Kurulum ve Çalıştırma

1. Projeyi klonlayın:
   ```bash
   git clone <repo-url>
   cd suru-yonetimi
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Çevre değişkenlerini ayarlayın:
   Kök dizinde `.env.local` adlı bir dosya oluşturun ve `.env.example` içerisindeki değişkenleri kendi bilgilerinizle doldurun:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Uygulamayı başlatın:
   ```bash
   npm run dev
   ```

## Lisans
Bu proje geliştirme aşamasındadır ve kullanım hakları saklıdır.
