# 🐄 SürüMetri — Kayıt Sisteminden Akıllı Platforma Geçiş Yol Haritası

## Mevcut Durumun Değerlendirmesi

Proje şu an şunlara sahip:
- ✅ Hayvan, sağlık, üreme, süt, ağırlık kayıt sistemi
- ✅ Rasyon hesaplayıcı (besin değerleriyle)
- ✅ Pedigree ağacı
- ✅ Finansal analiz & gelir/gider takibi
- ✅ Temel AI asistan (bağlam iletilen chat)
- ✅ Aşı protokol yönetimi & takvim
- ✅ Gerçek zamanlı Supabase senkronizasyonu
- ✅ Çoklu çiftlik desteği

**Eksikler / Geliştirme Alanları:**
- ❌ Tahminsel (predictive) analitik — "Bu inek ne zaman hasta olacak?"
- ❌ Otomatik anomali tespiti (süt düşüşü, ağırlık sapması vb.)
- ❌ AI asistana araç (tool-call) entegrasyonu — asistan veri değiştiremez
- ❌ Sürü düzeyinde benchmark karşılaştırması
- ❌ Mobil bildirim sistemi (push notification)
- ❌ Görsel raporlama & PDF export
- ❌ Otomatik görev/hatırlatma üretimi
- ❌ Veri kalitesi skorlaması
- ❌ Ekonomik optimizasyon (hangi hayvanı sat, hangisi ile devam et)

---

## 🗺️ Geliştirme Yol Haritası

### FAZA 1 — Zeki Uyarı & Anomali Motoru (2-3 hafta)

> **Hedef:** Sistem artık sadece "ne oldu" değil, "ne olabilir" de söylesin.

#### 1.1 Süt Verimi Anomali Tespiti
Mevcut `dashboardCalculations.ts` içindeki kayan ortalama hesabını genişlet:

```typescript
// Yeni: src/utils/anomalyDetection.ts
export function detectMilkDropAnomaly(hayvanId: string, sutKayitlari: SutKaydi[]): AnomalyAlert | null {
  // Son 7 günün ortalaması vs önceki 7 günün ortalaması
  // %15'ten fazla düşüş → kritik uyarı
  // Z-score tabanlı outlier tespiti
}
```

**Eklenecek tablo (Supabase):**
```sql
CREATE TABLE public.uyarilar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hayvan_id UUID REFERENCES public.hayvanlar(id),
  tip TEXT NOT NULL,          -- 'SUT_DUSUS', 'AGIRLIK_SAPMA', 'UREME_GECIKME'
  siddet TEXT NOT NULL,       -- 'DUSUK', 'ORTA', 'KRITIK'
  mesaj TEXT NOT NULL,
  okundu_mu BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id),
  ciftlik_id UUID,
  olusturulma TIMESTAMPTZ DEFAULT now()
);
```

#### 1.2 Ağırlık Büyüme Sapması
- Dana/buzağı için hedef ADG eğrisine karşı gerçek değer
- Sapma > %20 ise uyarı

#### 1.3 Üreme Gecikmesi Dedektörü
- Doğumdan sonra beklenen tohumlama penceresi geçilmişse otomatik uyarı
- "İnek #TR123 → doğumdan 90 gün geçti, henüz tohumlanmadı"

#### 1.4 Entegrasyon: Dashboard Uyarı Paneli
- Dashboard'a yeni bir `UyariPanel` bileşeni ekle
- Kritik uyarılar kırmızı badge ile gösterilsin
- Her uyarıya tıklanınca ilgili hayvanın detay sayfasına git

---

### FAZA 2 — AI Asistana Tool-Call Yetenekleri (2-3 hafta)

> **Hedef:** Asistan sadece okuma değil, yazma da yapabilsin.

#### 2.1 Mevcut Durum Analizi
`Assistant.tsx` içinde Gemini API'ye bağlam gönderilip metin yanıtı alınıyor. Asistan **veri ekleyemiyor, güncelleyemiyor**.

#### 2.2 Tool-Call Mimarisi

```typescript
// src/services/assistantTools.ts
export const ASSISTANT_TOOLS = [
  {
    name: "saglik_olayi_ekle",
    description: "Hayvana sağlık olayı kaydeder",
    parameters: {
      hayvan_kupe_no: "string",
      tur: "'Muayene' | 'Aşı' | 'İlaç' | 'Operasyon'",
      aciklama: "string",
      tarih: "string (YYYY-MM-DD)"
    }
  },
  {
    name: "sut_kaydi_ekle",
    description: "Süt kaydı ekler",
    parameters: { hayvan_kupe_no: "string", litre: "number", tarih: "string" }
  },
  {
    name: "hayvan_sor",
    description: "Belirli bir hayvana ait detaylı bilgileri sorgular",
    parameters: { kupe_no: "string" }
  },
  {
    name: "ureme_kaydi_ekle",
    description: "Üreme kaydı ekler",
    parameters: { hayvan_kupe_no: "string", tur: "UremeKaydiTur", tarih: "string", notlar: "string" }
  }
];
```

**Konuşma örneği:**
> Kullanıcı: "TR1234 numaralı ineğe bugün muayene yaptırdım, mastitis şüphesi var"
> Asistan: *`saglik_olayi_ekle` tool'unu çağırır* → veritabanına kaydeder → "Kaydettim. Mastitis şüphesi olan hayvanlarda somatik hücre sayısını takip etmenizi öneririm."

#### 2.3 Uygulama Adımları

1. `Assistant.tsx` içinde `tool_calls` yanıt işleyici yaz
2. Her tool için Dexie (`db.*`) fonksiyonu çağır
3. Tool sonucu modele geri gönder (tool_result mesajı)
4. UI'da yapılan işlemi göster (yeşil onay balonu)

---

### FAZA 3 — Tahminsel Analitik Paneli (3-4 hafta)

> **Hedef:** "Bu ay ne olacak?" sorusuna cevap ver.

#### 3.1 Üreme Tahmini (zaten var, genişlet)
- Şu an: Tahmini doğum tarihleri → Zaman çizelgesi
- Eklenecek: **Gebelik başarı olasılığı** (tohumlama sayısı, yaş, ırk bazında)
- Eklenecek: **Beklenen buzağı cinsiyeti istatistiği** (rassal ama eğlenceli)

#### 3.2 Finansal Projeksiyon Motoru

```typescript
// src/utils/financialProjection.ts
export function projectNextMonthRevenue(
  currentMilkAvg: number,
  milkPrice: number, 
  expectedBirths: number,
  feedCost: number
): FinancialProjection {
  // Sezonsal faktörler (yaz/kış süt düşüşü)
  // Doğum sonrası laktasyon artışı
  // Yem fiyat eğilimi (manuel giriş)
  return { projectedRevenue, projectedCost, projectedProfit, confidence };
}
```

**Yeni Dashboard widget'ı:**
- "Önümüzdeki 30 Günün Tahmini Geliri: ₺XX,XXX ± %Y"

#### 3.3 Sürü Verimlilik Skoru (SürüMetri Skoru™)

Her çiftlik için 0-100 arası bir skor:
- Süt verimi / ırk ortalaması (ağırlık: %30)
- Gebelik başına tohumlama sayısı (ağırlık: %25)
- Buzağılama aralığı (ağırlık: %20)
- Sağlık gider oranı / hayvan başı (ağırlık: %15)
- Yem verimliliği (süt/yem maliyeti) (ağırlık: %10)

```typescript
// src/utils/herdScore.ts
export function calculateHerdScore(data: HerdScoreInput): HerdScore {
  // Her metriği normalize et (0-100)
  // Ağırlıklı ortalama
  // Trend hesapla (geçen ay vs bu ay)
  return { total, breakdown, trend, benchmark };
}
```

---

### FAZA 4 — Ekonomik Optimizasyon Motoru (3-4 hafta)

> **Hedef:** "Bu hayvanı sat mı, tut mu?" sorusuna veri odaklı cevap.

#### 4.1 Hayvan Karlılık Analizi

Her hayvan için:
```
Karlılık = Toplam Gelir (süt + buzağı) - Toplam Gider (yem + sağlık + üreme)
ROI = Karlılık / (Alım Fiyatı veya Tahmini Değer)
```

**Yeni `AnimalDetail.tsx` bölümü:**
- Hayvanın ömür boyu karlılık grafiği
- "Bu hayvan son 12 ayda toplam ₺X kar/zarar etti"
- Sürü ortalamasıyla karşılaştırma

#### 4.2 Sürü Optimizasyon Önerisi

AI asistana bağlantılı prompt:
> "Sürümdeki en düşük verimli 5 hayvanı listele ve hangi kriterlere göre elden çıkarmayı değerlendirmeliyim?"

Asistan:
1. `calculateAnimalProfitability()` çağırır
2. Son 12 ay verilerini sıralar
3. Zooteknik yorumla birlikte liste sunar

#### 4.3 Yem Optimizasyonu
- Mevcut rasyon hesaplayıcıyı genişlet
- "Aynı besin değerini %X daha ucuza nasıl elde ederim?" sorusunu cevapla
- Yem fiyat/besin değer tablosuna göre alternatif rasyon öner

---

### FAZA 5 — Bildirim & Otomasyon Altyapısı (2-3 hafta)

#### 5.1 Web Push Bildirimleri

```typescript
// src/services/notificationService.ts
// Service Worker ile push notification
// Kritik uyarılar (gecikmiş aşı, süt düşüşü, doğum yaklaşıyor)
// Sabah 07:00'de günlük özet push
```

**Supabase Edge Function:**
```typescript
// supabase/functions/daily-digest/index.ts
// Her sabah çalışır
// Tüm kullanıcılar için o günkü görevleri hesapla
// Push notification veya e-posta gönder
```

#### 5.2 Akıllı Görev Listesi (Bugünün Görevleri)
Dashboard'a yeni bölüm:
- "Bugün yapılması gerekenler" (aşılar, kızgınlık kontrolleri, tartım günleri)
- Öncelik sıralaması (kritik > önemli > rutin)
- Tek tıkla tamamlandı işaretleme

#### 5.3 Otomatik Hatırlatma Oluşturma
Bir üreme kaydı girildiğinde sistem otomatik olarak:
- 21 gün sonra kızgınlık kontrolü görevi oluştur
- Tohumlama girildiğinde → 35 gün sonra gebelik kontrolü görevi
- Gebelik onaylandığında → 270 gün sonra doğum hatırlatması

---

### FAZA 6 — Veri Kalitesi & Raporlama (2-3 hafta)

#### 6.1 Veri Kalitesi Skoru
Her hayvan için bir veri tamlık yüzdesi:
- Doğum tarihi girilmiş mi? (+10p)
- Ağırlık kaydı var mı? Son 30 günde? (+20p)
- Süt kaydı düzenli mi? (+30p)
- Soy bilgisi var mı? (+10p)
- Fotoğraf var mı? (+5p)
- ...

Dashboard'da "Eksik Veri Uyarısı" bölümü.

#### 6.2 PDF & Excel Raporlama

```typescript
// src/services/reportService.ts
import jsPDF from 'jspdf';

export async function generateHerdReport(ciftlikId: string): Promise<Blob> {
  // Sürü özet sayfası
  // Hayvan başına verim tablosu
  // Finansal özet
  // Grafikler (canvas → PDF)
}
```

Önerilen kütüphaneler:
- **PDF:** `jspdf` + `html2canvas`
- **Excel:** `xlsx` (SheetJS)
- **Grafik export:** `recharts` + `dom-to-image`

#### 6.3 Veteriner Raporu
- Sağlık olaylarından otomatik veteriner raporu üret
- "Son 30 gün sağlık özeti" PDF'i

---

## 🛠️ Teknik Borç & Refaktoring

### Öncelikli iyileştirmeler:

1. **Tarih formatı standardizasyonu**
   - Şu an bazı tablolarda `tarih TEXT` (ISO string), bazılarında `TIMESTAMPTZ`
   - Tüm tarihleri `TIMESTAMPTZ`'ye migrate et → karşılaştırma hataları önlenir

2. **Tip güvenliği**
   - `detaylar JSONB` kolonlarını TypeScript'te proper type'a bağla
   - `as any` kullanımlarını temizle

3. **Performans**
   - Büyük sürülerde (500+ hayvan) Dexie sorguları yavaşlayabilir
   - IndexedDB indekslerini gözden geçir
   - Pagination ekle (AnimalList vb.)

4. **Test coverage**
   - `__tests__` dizini var ama coverage bilinmiyor
   - Kritik hesaplamalar için unit testler yaz (anomaly detection, financial projection)

---

## 📊 Öneri: Hangi Fazdan Başlamalısın?

| Faz | Etki | Geliştirme Süresi | Zorluk |
|-----|------|-------------------|--------|
| **Faza 1** — Uyarı Motoru | ⭐⭐⭐⭐⭐ | 2-3 hafta | Orta |
| **Faza 2** — AI Tool-Call | ⭐⭐⭐⭐⭐ | 2-3 hafta | Yüksek |
| **Faza 5** — Bildirim | ⭐⭐⭐⭐ | 2-3 hafta | Orta |
| **Faza 3** — Tahminsel Analitik | ⭐⭐⭐⭐ | 3-4 hafta | Yüksek |
| **Faza 6** — Raporlama | ⭐⭐⭐ | 2-3 hafta | Düşük |
| **Faza 4** — Ekonomik Optimizasyon | ⭐⭐⭐⭐ | 3-4 hafta | Yüksek |

> **Öneri:** **Faza 1**'den başla. Uyarı motoru hem kullanıcıya en hızlı değer katar hem de diğer fazlara zemin hazırlar (anomali verileri AI asistana bağlanır, bildirim sistemine entegre edilir).

---

## 🔑 Kritik Başarı Faktörleri

1. **Veri Girişini Kolaylaştır:** En zekice analiz bile yanlış/eksik veriyle değersizdir. Kullanıcıyı veri girişine teşvik eden UI/UX iyileştirmeleri yap.

2. **Açıklanabilir AI:** Asistan "Bu ineği sat" dediğinde **neden** dediğini de açıklamalı. Kara kutu değil, şeffaf öneriler.

3. **Offline-First:** Çiftlik koşullarında internet kesintisi normaldir. Dexie (IndexedDB) zaten var — yeni özellikler de offline çalışmalı, sonra sync olmalı.

4. **Basit Arayüz, Derin Analitik:** Analitik derinleşirken UI karmaşık hale gelmemeli. İleri analizler "İleri Görünüm" arkasına saklanabilir.
