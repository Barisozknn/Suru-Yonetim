import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, Plus, MessageSquare, Trash2, User, Menu, X, Sparkles, Mic, MicOff } from 'lucide-react';
import { db } from '../lib/db';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import type { Sohbet, Mesaj } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../store/useStore';
import { calculateTotalDailyFeedCost } from '../utils/dashboardCalculations';

const SAMPLE_QUESTIONS = [
  "Son gelir giderlerim nelerdir?",
  "Sürümde toplam kaç hayvan var?",
  "Hangi hayvanlarım gebe?",
  "Kaba yem stoklarım ne durumda?"
];

const STATIC_SYSTEM_PROMPT = `
# KİMLİK
Sen SürüMetri uygulamasının entegre zootekni asistanısın. Görevin, çiftlik sahibi veya sürü yöneticisinin uygulamadaki gerçek hayvan ve sürü verilerini yorumlamasına yardımcı olmaktır. 

# KAPSAM VE UZMANLIK ALANI
Süt ve besi sığırcılığı yönetimi, rasyon, süt verimi, üreme, gelir/gider analizi ve sağlık kayıtları konularında uzmansın.

# TEMEL DAVRANIŞ KURALLARI
1. **Sürü Verisi ve Uzmanlık Bilgisi:** Çiftliğin kendi verilerini (hayvanlar, stok vb.) uydurma, mutlaka elindeki verilere dayan. ANCAK, kullanıcı senden genel bir hayvancılık bilgisi, hammadde (yem) besin içerikleri (HP, ME, KM vb.) veya araştırma yapmanı isterse, ASLA "internetim yok" veya "erişimim yok" deme! Zootekni/hayvancılık alanındaki geniş bilgi birikimini kullanarak uluslararası veya Türkiye standartlarındaki (literatürdeki) ortalama, makul değerleri sun ve işlemleri bu değerlere göre yap.
2. **Kısa ve eyleme dönük yaz.** Çiftlik sahibi genelde sahada telefondan bakar. Madde işaretleriyle kısa özetler ve öneriler ver.
3. **Veteriner/ilaç sınırı.** Teşhis koymaz, ilaç dozu önermezsin.
4. **ARAÇ KULLANIMI VE ÇOKLU İŞLEM:** Kullanıcı senden bir işlem yapmanı isterse araçları (tools) kullan. Kullanıcı birden fazla gün için veya birden fazla hayvan için işlem yapmanı isterse, ARACI GEREKTİĞİ KADAR (örneğin 2 kez) ÇAĞIR. Asla "sen yapmalısın" deme. Tarih formatı ZORUNLU olarak **YYYY-MM-DD** (Örn: "2026-07-28") olmalıdır. Kullanıcı farklı tarih yazsa bile YYYY-MM-DD formatına çevir! DİKKAT: Aynı anda birden çok iş yapman gerekirse bunları standart "tool_calls" fonksiyonuyla çağır. Asla metin içerisine XML veya DSML etiketleri (<|DSML|>, <|invoke|>) YAZMA! Tarih belirtilmezse bugünü kullan.

# YANITLAMA FORMATI
- Formatlamak için Markdown kullan.
- Maksimum 3-4 maddelik kısa listeler tercih et. Sayısal verilerde birim belirt.
- Sana iletilen gelir, gider, hayvan sayısı gibi metrikleri net bir şekilde kullanıcıya sun.
`.trim();

const parseDateString = (dateStr: string | undefined): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  let match = dateStr.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    return `${match[3]}-${month}-${day}`;
  }
  
  const aylar: Record<string, string> = {
    "ocak": "01", "şubat": "02", "subat": "02", "mart": "03", "nisan": "04",
    "mayıs": "05", "mayis": "05", "haziran": "06", "temmuz": "07", 
    "ağustos": "08", "agustos": "08", "eylül": "09", "eylul": "09",
    "ekim": "10", "kasım": "11", "kasim": "11", "aralık": "12", "aralik": "12"
  };
  
  match = dateStr.toLowerCase().match(/^(\d{1,2})\s+([a-zşçöğüı]+)\s+(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const ayIsmi = match[2];
    const month = aylar[ayIsmi] || "01";
    return `${match[3]}-${month}-${day}`;
  }

  if (dateStr.toLowerCase() === "dün" || dateStr.toLowerCase() === "dun") {
     const yesterday = new Date();
     yesterday.setDate(yesterday.getDate() - 1);
     return yesterday.toISOString().split('T')[0];
  }

  return new Date().toISOString().split('T')[0];
};

const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "addMilkRecord",
      description: "Belirtilen küpe numarasına sahip ineğe yeni bir günlük süt kaydı ekler.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası (örn: TR123456)" },
          litre: { type: "number", description: "O gün sağılan toplam süt miktarı (litre)" },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD). Belirtilmezse bugünün tarihi kullanılır." }
        },
        required: ["kupeNo", "litre", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addHealthRecord",
      description: "Belirtilen küpe numarasına sahip hayvana sağlık veya aşı kaydı ekler.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın tam küpe numarası" },
          tur: { type: "string", enum: ["Aşı", "Muayene", "İlaç", "Operasyon", "Diğer"], description: "Sağlık olayının türü" },
          aciklama: { type: "string", description: "Sağlık olayı hakkında açıklama, teşhis veya aşı adı" },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD). Belirtilmezse bugünün tarihi kullanılır." }
        },
        required: ["kupeNo", "tur", "aciklama", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateFeedStock",
      description: "Depodaki mevcut bir yeme stok girişi yapar veya stoktan harcar.",
      parameters: {
        type: "object",
        properties: {
          yemAdi: { type: "string", description: "Yemin adı (örn: Mısır Silajı)" },
          miktarKg: { type: "number", description: "Eklenecek veya harcanacak miktar (kg). Pozitif bir sayı olmalıdır." },
          islemTipi: { type: "string", enum: ["Giriş", "Çıkış"], description: "Giriş (alım) veya Çıkış (harcama)" },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD). Belirtilmezse bugünün tarihi kullanılır." }
        },
        required: ["yemAdi", "miktarKg", "islemTipi", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateFeedNutrition",
      description: "Mevcut bir yemin besin değerlerini (Kuru Madde, Enerji/ME, Protein/HP vb.) ve fiyatını günceller.",
      parameters: {
        type: "object",
        properties: {
          yemAdi: { type: "string", description: "Yemin adı (örn: Mısır Silajı)" },
          tur: { type: "string", enum: ["Kaba Yem", "Kesif Yem", "Mineral/Vitamin", "Premiks", "Katkı"], description: "Yem türü" },
          minStokUyariKg: { type: "number", description: "Minimum stok uyarı seviyesi (kg)" },
          birimFiyat: { type: "number", description: "Yeni birim fiyatı (TL/Kg). Güncellenmeyecekse 0 veya boş bırakın." },
          kmYuzde: { type: "number", description: "Kuru Madde (KM %)" },
          meMcalKg: { type: "number", description: "Metabolik Enerji (ME Mcal/kg)" },
          hpYuzde: { type: "number", description: "Ham Protein (HP %)" },
          caYuzde: { type: "number", description: "Kalsiyum (Ca %)" },
          pYuzde: { type: "number", description: "Fosfor (P %)" }
        },
        required: ["yemAdi"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addFeed",
      description: "Sisteme sıfırdan yeni bir yem türü / hammaddesi ekler.",
      parameters: {
        type: "object",
        properties: {
          yemAdi: { type: "string", description: "Yemin adı (örn: Mısır Silajı)" },
          tur: { type: "string", enum: ["Kaba Yem", "Kesif Yem", "Mineral/Vitamin", "Premiks", "Katkı", "Sıvı"], description: "Yem türü" },
          birimFiyat: { type: "number", description: "Birim fiyatı (TL/Kg)" },
          minStokUyariKg: { type: "number", description: "Minimum stok uyarı seviyesi (kg)" },
          ilkStokKg: { type: "number", description: "Yem eklendiğindeki başlangıç/ilk stok miktarı (kg)" },
          tarih: { type: "string", description: "Yemin veya ilk stoğun eklendiği tarih (YYYY-MM-DD)" },
          kmYuzde: { type: "number", description: "Kuru Madde (KM %). Eğer bir değer hesapladıysan veya tahmin ettiysen mutlaka argüman olarak gönder!" },
          meMcalKg: { type: "number", description: "Metabolik Enerji (ME Mcal/kg). Hesapladıysan veya tahmin ettiysen mutlaka argüman olarak gönder!" },
          hpYuzde: { type: "number", description: "Ham Protein (HP %). Hesapladıysan veya tahmin ettiysen mutlaka argüman olarak gönder!" },
          caYuzde: { type: "number", description: "Kalsiyum (Ca %). Hesapladıysan veya tahmin ettiysen mutlaka argüman olarak gönder!" },
          pYuzde: { type: "number", description: "Fosfor (P %). Hesapladıysan veya tahmin ettiysen mutlaka argüman olarak gönder!" }
        },
        required: ["yemAdi", "tur"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addVaccineProtocol",
      description: "Sisteme yeni bir aşı protokolü veya sağlık uygulama programı (örneğin Buzağı Aşı Protokolü) ekler.",
      parameters: {
        type: "object",
        properties: {
          protokolAd: { type: "string", description: "Protokolün adı (örn: Buzağı İshal Aşısı Protokolü)" },
          hedefTur: { type: "string", enum: ["İnek", "Tosun", "Boğa", "Öküz", "Düve", "Dana", "Buzağı", "Tümü"], description: "Hangi hayvan türüne uygulanacağı" },
          uygulamalar: { 
            type: "array", 
            description: "Protokoldeki aşı/uygulama adımları",
            items: {
              type: "object",
              properties: {
                asiAd: { type: "string", description: "Aşının veya ilacın adı" },
                gunFarki: { type: "number", description: "Doğumdan veya başlangıçtan kaç gün sonra yapılacağı (0 = doğduğunda)" },
                tekrarGun: { type: "number", description: "Kaç günde bir tekrarlanacağı (isteğe bağlı, yoksa 0)" },
                tekrarSayisi: { type: "number", description: "Kaç kez tekrar edileceği (isteğe bağlı, yoksa 1)" }
              }
            }
          }
        },
        required: ["protokolAd", "hedefTur", "uygulamalar"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addAnimal",
      description: "Sisteme sıfırdan yeni bir hayvan ekler.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası" },
          tur: { type: "string", enum: ["İnek", "Tosun", "Boğa", "Öküz", "Düve", "Dana", "Buzağı"], description: "Hayvanın türü" },
          cinsiyet: { type: "string", enum: ["Erkek", "Dişi"], description: "Cinsiyet" },
          irk: { type: "string", description: "Hayvanın ırkı (Holstein, Simental vb.)" },
          dogumTarihi: { type: "string", description: "Doğum tarihi (YYYY-MM-DD formatında, bilinmiyorsa bugünün tarihi)" },
          guncelAgirlikKg: { type: "number", description: "Mevcut ağırlığı (kg)" }
        },
        required: ["kupeNo", "tur", "cinsiyet", "irk", "dogumTarihi", "guncelAgirlikKg"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateAnimalStatus",
      description: "Hayvanın genel durumunu değiştirir (Örn: Satıldı veya Öldü).",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası" },
          durum: { type: "string", enum: ["Aktif", "Satıldı", "Öldü"], description: "Hayvanın yeni durumu" },
          satisFiyati: { type: "number", description: "Satıldıysa satış fiyatı (TL). Satılmadıysa veya verilmediyse 0 gönderin." },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD)" }
        },
        required: ["kupeNo", "durum", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "changeAnimalGroup",
      description: "Hayvanı bulunduğu gruptan başka bir gruba taşır.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası" },
          hedefGrupAdi: { type: "string", description: "Taşınacağı hedefin (grubun) tam adı veya adına çok benzeyen kelime" }
        },
        required: ["kupeNo", "hedefGrupAdi"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateAnimalNote",
      description: "Belirtilen küpe numarasına sahip hayvanın notlar/açıklama bilgisini günceller veya not ekler.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası" },
          not: { type: "string", description: "Eklenecek veya güncellenecek yeni not metni" }
        },
        required: ["kupeNo", "not"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addWeightRecord",
      description: "Hayvan için canlı ağırlık (tartım) kaydı ekler ve güncel ağırlığını günceller.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası" },
          kg: { type: "number", description: "Tartılan yeni ağırlık (kg)" },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD). Belirtilmezse bugünün tarihi kullanılır." }
        },
        required: ["kupeNo", "kg", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addReproductionRecord",
      description: "İnek veya düveler için üreme (reprodüksiyon) takvimi olayı ekler.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası" },
          tur: { type: "string", enum: ["Kızgınlık", "Tohumlama/Aşım", "Gebelik Kontrolü", "Doğum", "Kuruya Çıkarma", "Düşük/Ölü Doğum", "Diğer"], description: "Olay Türü" },
          durum: { type: "string", enum: ["Gebe", "Boş", "Şüpheli", "Başarılı", "Başarısız", "Beklemede"], description: "Olayın veya tohumlamanın durumu" },
          notlar: { type: "string", description: "Varsa olaya ait ekstra açıklama" },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD). Belirtilmezse bugünün tarihi kullanılır." }
        },
        required: ["kupeNo", "tur", "durum", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addCalfRecord",
      description: "Yeni doğan veya mevcut bir buzağıya 'Buzağı Büyütme Takibi' kaydı açar.",
      parameters: {
        type: "object",
        properties: {
          kupeNo: { type: "string", description: "Buzağının kendi küpe numarası" },
          dogumAgirligiKg: { type: "number", description: "Doğum ağırlığı (kg)" },
          agizSutuLitre: { type: "number", description: "İçtiği ağız sütü miktarı (Litre)" }
        },
        required: ["kupeNo", "dogumAgirligiKg", "agizSutuLitre"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addNewFeedType",
      description: "Yem deposuna sistemde hiç olmayan yeni bir yem cinsi tanımlar.",
      parameters: {
        type: "object",
        properties: {
          yemAdi: { type: "string", description: "Yemin adı (Örn: Yonca Balyası, Mısır Silajı)" },
          tur: { type: "string", enum: ["Kaba Yem", "Kesif Yem", "Mineral/Vitamin"], description: "Yemin türü" },
          birimFiyat: { type: "number", description: "KG başına birim fiyatı (TL)" },
          stokKg: { type: "number", description: "Mevcut/Başlangıç stok miktarı (kg)" },
          minStokUyariKg: { type: "number", description: "Uyarı verilecek minimum stok seviyesi (kg)" }
        },
        required: ["yemAdi", "tur", "birimFiyat", "stokKg", "minStokUyariKg"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createNewGroup",
      description: "Çiftliğe yeni bir fiziksel/mantıksal hayvan grubu (padok/bölme) ekler.",
      parameters: {
        type: "object",
        properties: {
          grupAdi: { type: "string", description: "Grubun adı (Örn: 1. Laktasyon İnekler, Besi Danaları)" },
          tur: { type: "string", enum: ["İnek", "Tosun", "Boğa", "Öküz", "Düve", "Dana", "Buzağı", "Karma"], description: "Grupta barınacak hayvan türü" },
          aciklama: { type: "string", description: "Grup hakkında kısa bilgi" }
        },
        required: ["grupAdi", "tur"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addFinancialTransaction",
      description: "Çiftliğin genel finans defterine ek Gelir veya Gider kaydeder (Süt satışı veya hayvan satışı HARİCİ tüm masraflar).",
      parameters: {
        type: "object",
        properties: {
          tip: { type: "string", enum: ["Gelir", "Gider"], description: "İşlemin tipi" },
          kategori: { type: "string", description: "İşlem kategorisi (Örn: Veteriner & İlaç, Ekipman, Yakıt, Yem, İşçilik)" },
          miktar: { type: "number", description: "İşlem tutarı (TL)" },
          aciklama: { type: "string", description: "Harcamanın detayı" },
          tarih: { type: "string", description: "İşlem tarihi (YYYY-MM-DD). Belirtilmezse bugünün tarihi kullanılır." }
        },
        required: ["tip", "kategori", "miktar", "aciklama", "tarih"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assignRationToGroup",
      description: "Bir hayvan grubuna özel bir rasyon reçetesi (isim ve içerik özeti) tanımlar veya atar.",
      parameters: {
        type: "object",
        properties: {
          grupAdi: { type: "string", description: "Rasyonun atanacağı grubun adı (Örn: Sağmallar, Besi Danaları)" },
          rasyonAdi: { type: "string", description: "Atanacak rasyonun adı (Örn: Yüksek Verimli Süt Rasyonu)" },
          rasyonOzet: { type: "string", description: "Rasyonun içeriği (Örn: 15 kg mısır silajı, 5 kg yonca, 2 kg süt yemi vb.)" }
        },
        required: ["grupAdi", "rasyonAdi", "rasyonOzet"]
      }
    }
  }
];

const gatherFarmContext = async () => {
  const [
    hayvanlar,
    yemler,
    ekFinansalIslemler,
    sutKayitlari,
    planlananAsilar,
    uremeKayitlari,
    saglikOlaylari,
    gunlukYemMaliyetleri,
    gruplar,
    agirlikKayitlari,
    asiProtokolleri,
    buzagiKayitlari,
    yemHareketleri
  ] = await Promise.all([
    db.hayvanlar.toArray(),
    db.yemler.toArray(),
    db.ekFinansalIslemler.toArray(),
    db.sutKayitlari.toArray(),
    db.planlananAsilar.toArray(),
    db.uremeKayitlari.toArray(),
    db.saglikOlaylari.toArray(),
    db.gunlukYemMaliyetleri.toArray(),
    db.gruplar.toArray(),
    db.agirlikKayitlari.toArray(),
    db.asiProtokolleri.toArray(),
    db.buzagiKayitlari.toArray(),
    db.yemHareketleri.toArray()
  ]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Hayvan Özeti
  const hayvanOzeti = {
    toplam: hayvanlar.length,
    inek: hayvanlar.filter(h => h.tur === 'İnek').length,
    duve: hayvanlar.filter(h => h.tur === 'Düve').length,
    dana: hayvanlar.filter(h => h.tur === 'Dana').length,
    buzagi: hayvanlar.filter(h => h.tur === 'Buzağı').length
  };

  // Finansal Özet (Bu ay)
  const isInThisMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const sutLitreFiyati = useStore.getState().sutLitreFiyati;

  // 1. Süt Geliri
  const buAySut = sutKayitlari.filter(k => isInThisMonth(k.tarih));
  const sutGeliri = buAySut.reduce((acc, curr) => acc + curr.litre, 0) * sutLitreFiyati;

  // 2. Hayvan Satış Geliri
  const buAySatis = hayvanlar.filter(h => h.durum === 'Satıldı' && isInThisMonth(h.satisTarihi));
  const hayvanSatisGeliri = buAySatis.reduce((acc, curr) => acc + (curr.satisFiyati || 0), 0);

  // 3. Sağlık Gideri
  const buAySaglik = saglikOlaylari.filter(s => isInThisMonth(s.tarih));
  let saglikGideri = buAySaglik.reduce((acc, curr) => acc + (curr.maliyet || 0), 0);
  const buAyAsilar = planlananAsilar.filter(a => a.yapildiMi && isInThisMonth(a.yapilmaTarihi));
  saglikGideri += buAyAsilar.reduce((acc, curr) => acc + (curr.maliyet || 0), 0);

  // 4. Üreme Gideri
  const buAyUreme = uremeKayitlari.filter(u => isInThisMonth(u.tarih));
  const uremeGideri = buAyUreme.reduce((acc, curr) => acc + (curr.maliyet || 0), 0);

  // 5. Yem Gideri
  const todayStr = new Date().toISOString().split('T')[0];
  const buAyYemler = gunlukYemMaliyetleri.filter(y => isInThisMonth(y.tarih) && y.tarih !== todayStr);
  let yemGideri = buAyYemler.reduce((acc, curr) => acc + curr.toplamMaliyet, 0);
  
  if (isInThisMonth(todayStr)) {
    yemGideri += calculateTotalDailyFeedCost(yemler, gruplar, hayvanlar);
  }

  // 6. Ek Gelir / Giderler
  const buAykiFinans = ekFinansalIslemler.filter(islem => isInThisMonth(islem.tarih));
  const ekGelir = buAykiFinans.filter(i => i.tip === 'Gelir').reduce((sum, i) => sum + i.miktar, 0);
  const ekGider = buAykiFinans.filter(i => i.tip === 'Gider').reduce((sum, i) => sum + i.miktar, 0);

  const toplamGelir = sutGeliri + hayvanSatisGeliri + ekGelir;
  const toplamGider = saglikGideri + uremeGideri + yemGideri + ekGider;

  // Süt Özeti (Son 7 gün)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const son7GunSut = sutKayitlari.filter(k => new Date(k.tarih).getTime() >= sevenDaysAgo.getTime()).reduce((sum, k) => sum + k.litre, 0);

  // Yem Özeti
  const kritikYemler = yemler.filter(y => y.stokKg <= y.minStokUyariKg).map(y => `${y.ad} (${y.stokKg} kg)`);

  // Üreme Özeti
  const gebeSayisi = uremeKayitlari.filter(u => u.tur === 'Gebelik Kontrolü' && u.durum === 'Gebe').length;
  const asimBekleyen = uremeKayitlari.filter(u => u.tur === 'Tohumlama/Aşım').length;
  
  // Bekleyen Aşılar
  const bekleyenAsiSayisi = planlananAsilar.filter(a => !a.yapildiMi && new Date(a.planlanaTarih).getTime() < Date.now()).length;

  return {
    veriler: {
      hayvanOzeti,
      finansalOzet_BuAy: {
        toplamGelir_TL: toplamGelir,
        toplamGider_TL: toplamGider,
        netDurum_TL: toplamGelir - toplamGider
      },
      sutUretimi_Son7GunLitre: son7GunSut,
      gebeHayvanSayisi: gebeSayisi,
      tohumlamaKayıtları: asimBekleyen,
      gecikmisAsiSayisi: bekleyenAsiSayisi,
      tumGruplar: gruplar,
      tumYemler: yemler,
      tumYemHareketleri: yemHareketleri,
      tumSutKayitlari: sutKayitlari,
      tumAgirlikKayitlari: agirlikKayitlari,
      tumSaglikOlaylari: saglikOlaylari,
      tumUremeKayitlari: uremeKayitlari,
      tumBuzagiKayitlari: buzagiKayitlari,
      tumAsiProtokolleri: asiProtokolleri,
      tumPlanlananAsilar: planlananAsilar,
      aktifHayvanListesi: hayvanlar
        .filter(h => h.durum === 'Aktif')
        .map(h => ({
          id: h.id,
          kupeNo: h.kupeNo,
          tur: h.tur,
          cinsiyet: h.cinsiyet,
          irk: h.irk,
          dogumTarihi: h.dogumTarihi,
          guncelAgirlikKg: h.guncelAgirlikKg,
          grupId: h.grupId,
          anneKupeNo: h.anneKupeNo || 'Bilinmiyor',
          babaKupeNo: h.babaKupeNo || 'Bilinmiyor',
          gebeMi: uremeKayitlari.some(u => u.hayvanId === h.id && u.tur === 'Gebelik Kontrolü' && u.durum === 'Gebe') ? 'Evet' : 'Hayır',
          notlar: h.notlar || 'Yok'
        }))
    },
    esikUyarilari: kritikYemler.map(y => `Kritik Yem Stoğu: ${y}`)
  };
};

export function buildContextBlock(ctx: any): string {
  const uyarilar =
    ctx.esikUyarilari && ctx.esikUyarilari.length > 0
      ? `\n## Eşik Dışı Değerler (öncelikli)\n${ctx.esikUyarilari.map((u: string) => `- ${u}`).join("\n")}\n`
      : "";
  
  const today = new Date().toLocaleDateString('tr-TR');

  return `
# GÜNCEL SÜRÜ VERİSİ (Tarih: ${today})
${uyarilar}
## İlgili Metrikler (Tüm Modüllerden Özet)
${JSON.stringify(ctx.veriler || {}, null, 2)}

Yukarıdaki veriler dışında hiçbir sayısal değer varsayma. Sadece bu veriler üzerinden yorum yap.
`.trim();
}

const Assistant: React.FC = () => {
  const sohbetler = useLiveFarmQuery(() => db.sohbetler.orderBy('guncellenmeTarihi').reverse().toArray()) || [];
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  const activeChat = sohbetler.find(s => s.id === activeChatId);
  const messages = activeChat?.mesajlar || [];

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [tempMessages, setTempMessages] = useState<Mesaj[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const displayMessages = activeChat ? messages : tempMessages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, isLoading]);

  const handleCreateNewChat = () => {
    setActiveChatId(null);
    setTempMessages([]);
    setError(null);
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Bu sohbeti silmek istediğinize emin misiniz?')) {
      await db.sohbetler.delete(id);
      await db.syncQueue.add({ table: 'sohbetler', action: 'DELETE', payload: { id }, created_at: Date.now() });
      if(activeChatId === id) handleCreateNewChat();
    }
  };

  const toggleListening = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayıcınız sesli komut özelliğini desteklemiyor. Lütfen Chrome, Edge veya Safari kullanın.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'tr-TR';
    recognition.interimResults = true;
    recognition.continuous = true;
    
    let finalTranscript = input;
    let silenceTimer: any = null;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      if (silenceTimer) clearTimeout(silenceTimer);
      
      let interimTranscript = '';
      let currentFinal = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (currentFinal) {
         finalTranscript = (finalTranscript + " " + currentFinal).trim();
         setInput(finalTranscript);
      } else {
         setInput((finalTranscript + " " + interimTranscript).trim());
      }
      
      silenceTimer = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 1500);
    };

    recognition.onerror = (event: any) => {
      console.error("Ses tanıma hatası:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Mesaj = { role: 'user', content: text, createdAt: Date.now() };
    
    let currentChatId = activeChatId;
    let currentMessages = [...displayMessages, userMessage];

    if (!currentChatId) {
      const newChat: Sohbet = {
        id: uuidv4(),
        baslik: text.length > 30 ? text.substring(0, 30) + '...' : text,
        olusturulmaTarihi: Date.now(),
        guncellenmeTarihi: Date.now(),
        mesajlar: currentMessages
      };
      await db.sohbetler.add(newChat);
      await db.syncQueue.add({ table: 'sohbetler', action: 'INSERT', payload: newChat, created_at: Date.now() });
      currentChatId = newChat.id;
      setActiveChatId(newChat.id);
    } else {
      await db.sohbetler.update(currentChatId, { mesajlar: currentMessages, guncellenmeTarihi: Date.now() });
      const updatedChat = await db.sohbetler.get(currentChatId);
      if (updatedChat) {
         await db.syncQueue.add({ table: 'sohbetler', action: 'UPDATE', payload: updatedChat, created_at: Date.now() });
      }
    }

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_DEEPSEEK_API_KEY bulunamadı. Lütfen .env.local dosyasına ekleyin.');
      }

      // Veritabanından tüm farm verisini (gelir/gider dahil) özet olarak topla
      const contextData = await gatherFarmContext();
      
      const systemPrompt = {
        role: 'system',
        content: `${STATIC_SYSTEM_PROMPT}\n\n# BİLGİ\nBugünün Tarihi: ${new Date().toISOString().split('T')[0]}`
      };

      const contextPrompt = {
        role: 'system',
        content: buildContextBlock(contextData)
      };

      let apiMessages: any[] = [systemPrompt, contextPrompt, ...currentMessages.map(m => {
          return { role: m.role, content: m.content || "" };
      }).filter(m => m.role !== 'system')];

      let response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: apiMessages,
          temperature: 0.3,
          tools: ASSISTANT_TOOLS,
          tool_choice: "auto"
        }),
      });

      let data = await response.json();

      if (!response.ok || !data.choices || data.choices.length === 0) {
        throw new Error(data.error?.message || `API Hatası: ${response.status}`);
      }

      let responseMessage = data.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        apiMessages.push(responseMessage); // Asistanın fonksiyon çağırma niyetini history'e ekle

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let functionResult = "";

          try {
            if (functionName === "addMilkRecord") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Belirtilen küpe numarasına sahip hayvan bulunamadı.");
               const payload = {
                 id: uuidv4(),
                 hayvanId: hayvan.id,
                 tarih: parseDateString(functionArgs.tarih),
                 litre: functionArgs.litre
               };
               await db.sutKayitlari.add(payload);
               await db.syncQueue.add({ table: 'sutKayitlari', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Süt kaydı başarıyla eklendi. (Litre: ${payload.litre})`;

            } else if (functionName === "addHealthRecord") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Belirtilen küpe numarasına sahip hayvan bulunamadı.");
               const payload = {
                  id: uuidv4(),
                  hayvanId: hayvan.id,
                  tarih: parseDateString(functionArgs.tarih),
                  tur: functionArgs.tur,
                  aciklama: functionArgs.aciklama,
                  arinmaSuresiGun: 0
               };
               await db.saglikOlaylari.add(payload as any);
               await db.syncQueue.add({ table: 'saglikOlaylari', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Sağlık kaydı başarıyla eklendi. (Tür: ${payload.tur})`;

            } else if (functionName === "updateFeedStock") {
               const yems = await db.yemler.toArray();
               const hedefYem = yems.find(y => y.ad.toLowerCase() === functionArgs.yemAdi.toLowerCase());
               if (!hedefYem) throw new Error(`"${functionArgs.yemAdi}" isminde bir yem bulunamadı.`);
               
               const artisMi = functionArgs.islemTipi === "Giriş";
               const miktar = functionArgs.miktarKg;
               const newStock = artisMi ? (hedefYem.stokKg + miktar) : (hedefYem.stokKg - miktar);
               
               const hareketPayload = {
                  id: uuidv4(),
                  yemId: hedefYem.id,
                  islemTarihi: parseDateString(functionArgs.tarih),
                  islemTuru: functionArgs.islemTipi,
                  miktarKg: miktar,
                  birimFiyat: hedefYem.birimFiyat,
                  toplamTutar: miktar * hedefYem.birimFiyat
               };
               
               await db.yemHareketleri.add(hareketPayload as any);
               await db.syncQueue.add({ table: 'yemHareketleri', action: 'INSERT', payload: hareketPayload, created_at: Date.now() });
               
               const updatedYem = { ...hedefYem, stokKg: newStock };
               await db.yemler.update(hedefYem.id, updatedYem);
               await db.syncQueue.add({ table: 'yemler', action: 'UPDATE', payload: updatedYem, created_at: Date.now() });
               
               functionResult = `Yem stoğu güncellendi. Yeni Stok: ${newStock} kg.`;
               
            } else if (functionName === "updateFeedNutrition") {
               const yems = await db.yemler.toArray();
               const hedefYem = yems.find(y => y.ad.toLowerCase() === functionArgs.yemAdi.toLowerCase());
               if (!hedefYem) throw new Error(`"${functionArgs.yemAdi}" isminde bir yem bulunamadı.`);
               
               const updatedYem = { 
                  ...hedefYem,
                  tur: functionArgs.tur !== undefined ? functionArgs.tur : hedefYem.tur,
                  minStokUyariKg: functionArgs.minStokUyariKg !== undefined ? functionArgs.minStokUyariKg : hedefYem.minStokUyariKg,
                  birimFiyat: functionArgs.birimFiyat !== undefined && functionArgs.birimFiyat > 0 ? functionArgs.birimFiyat : hedefYem.birimFiyat,
                  kmYuzde: functionArgs.kmYuzde !== undefined ? functionArgs.kmYuzde : hedefYem.kmYuzde,
                  meMcalKg: functionArgs.meMcalKg !== undefined ? functionArgs.meMcalKg : hedefYem.meMcalKg,
                  hpYuzde: functionArgs.hpYuzde !== undefined ? functionArgs.hpYuzde : hedefYem.hpYuzde,
                  caYuzde: functionArgs.caYuzde !== undefined ? functionArgs.caYuzde : hedefYem.caYuzde,
                  pYuzde: functionArgs.pYuzde !== undefined ? functionArgs.pYuzde : hedefYem.pYuzde
               };
               
               await db.yemler.update(hedefYem.id, updatedYem);
               await db.syncQueue.add({ table: 'yemler', action: 'UPDATE', payload: updatedYem, created_at: Date.now() });
               
               functionResult = `Yem besin değerleri güncellendi. (Yeni Fiyat: ${updatedYem.birimFiyat} TL, KM: ${updatedYem.kmYuzde}%, ME: ${updatedYem.meMcalKg}, HP: ${updatedYem.hpYuzde}%)`;
               
            } else if (functionName === "addFeed") {
               const yems = await db.yemler.toArray();
               const existingYem = yems.find(y => y.ad.toLowerCase() === functionArgs.yemAdi.toLowerCase());
               if (existingYem) throw new Error(`"${functionArgs.yemAdi}" isminde bir yem zaten var.`);
               
               const baslangicStok = functionArgs.ilkStokKg || 0;
               const fiyat = functionArgs.birimFiyat || 0;
               const islemTarihiStr = parseDateString(functionArgs.tarih);
               
               const payload = {
                 id: uuidv4(),
                 ad: functionArgs.yemAdi,
                 tur: functionArgs.tur,
                 stokKg: baslangicStok,
                 birimFiyat: fiyat,
                 minStokUyariKg: functionArgs.minStokUyariKg !== undefined ? functionArgs.minStokUyariKg : 500,
                 kmYuzde: functionArgs.kmYuzde !== undefined ? functionArgs.kmYuzde : 88,
                 meMcalKg: functionArgs.meMcalKg !== undefined ? functionArgs.meMcalKg : 2.2,
                 hpYuzde: functionArgs.hpYuzde !== undefined ? functionArgs.hpYuzde : 12,
                 caYuzde: functionArgs.caYuzde !== undefined ? functionArgs.caYuzde : 0.5,
                 pYuzde: functionArgs.pYuzde !== undefined ? functionArgs.pYuzde : 0.3,
                 eklenmeTarihi: Date.now()
               };
               
               await db.yemler.add(payload as any);
               await db.syncQueue.add({ table: 'yemler', action: 'INSERT', payload, created_at: Date.now() });
               
               if (baslangicStok > 0) {
                 const hareketPayload = {
                    id: uuidv4(),
                    yemId: payload.id,
                    islemTarihi: islemTarihiStr,
                    islemTuru: "Giriş",
                    miktarKg: baslangicStok,
                    birimFiyat: fiyat,
                    toplamTutar: baslangicStok * fiyat
                 };
                 await db.yemHareketleri.add(hareketPayload as any);
                 await db.syncQueue.add({ table: 'yemHareketleri', action: 'INSERT', payload: hareketPayload, created_at: Date.now() });
               }
               
               functionResult = `"${payload.ad}" başarıyla sisteme yeni yem olarak kaydedildi. (Fiyat: ${payload.birimFiyat} TL, Stok: ${baslangicStok} kg)`;
               
            } else if (functionName === "addVaccineProtocol") {
               const payload = {
                 id: uuidv4(),
                 ad: functionArgs.protokolAd,
                 hedefTur: functionArgs.hedefTur,
                 uygulamalar: (functionArgs.uygulamalar || []).map((u: any) => ({
                    ad: u.asiAd,
                    gunFarki: u.gunFarki || 0,
                    tekrarGun: u.tekrarGun || undefined,
                    tekrarSayisi: u.tekrarSayisi || undefined,
                    surekliTekrar: false,
                    maliyet: 0
                 }))
               };
               
               await db.asiProtokolleri.add(payload as any);
               await db.syncQueue.add({ table: 'asiProtokolleri', action: 'INSERT', payload, created_at: Date.now() });
               
               functionResult = `"${payload.ad}" isimli aşı protokolü başarıyla eklendi (${payload.uygulamalar.length} farklı aşama içeriyor).`;
               
            } else if (functionName === "addAnimal") {
               const payload = {
                 id: uuidv4(),
                 kupeNo: functionArgs.kupeNo,
                 tur: functionArgs.tur,
                 cinsiyet: functionArgs.cinsiyet,
                 irk: functionArgs.irk,
                 dogumTarihi: functionArgs.dogumTarihi,
                 guncelAgirlikKg: functionArgs.guncelAgirlikKg,
                 durum: 'Aktif',
                 grupId: null
               };
               await db.hayvanlar.add(payload as any);
               await db.syncQueue.add({ table: 'hayvanlar', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Hayvan başarıyla sisteme kaydedildi. (Küpe: ${payload.kupeNo})`;

            } else if (functionName === "updateAnimalStatus") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Hayvan bulunamadı.");
               
               const updatedHayvan = { 
                 ...hayvan, 
                 durum: functionArgs.durum, 
                 satisFiyati: functionArgs.satisFiyati || 0,
                 satisTarihi: functionArgs.satisFiyati ? functionArgs.tarih : undefined 
               };
               
               await db.hayvanlar.update(hayvan.id, updatedHayvan);
               await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
               functionResult = `Hayvanın durumu '${functionArgs.durum}' olarak güncellendi.`;

            } else if (functionName === "changeAnimalGroup") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Hayvan bulunamadı.");
               
               const gruplar = await db.gruplar.toArray();
               const hedefGrup = gruplar.find(g => g.ad.toLowerCase().includes(functionArgs.hedefGrupAdi.toLowerCase()));
               if (!hedefGrup) throw new Error(`'${functionArgs.hedefGrupAdi}' isminde bir grup bulunamadı.`);
               
               const updatedHayvan = { ...hayvan, grupId: hedefGrup.id };
               await db.hayvanlar.update(hayvan.id, updatedHayvan);
               await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
               functionResult = `Hayvan başarıyla '${hedefGrup.ad}' grubuna taşındı.`;

            } else if (functionName === "updateAnimalNote") {
                const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
                if (!hayvan) throw new Error("Belirtilen küpe numarasına sahip hayvan bulunamadı.");
                
                const updatedHayvan = { ...hayvan, notlar: functionArgs.not };
                await db.hayvanlar.update(hayvan.id, updatedHayvan);
                await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
                functionResult = `Hayvan notları başarıyla güncellendi. Yeni Not: ${functionArgs.not}`;

             } else if (functionName === "addWeightRecord") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Hayvan bulunamadı.");
               
               const payload = {
                 id: uuidv4(),
                 hayvanId: hayvan.id,
                 tarih: parseDateString(functionArgs.tarih),
                 kg: functionArgs.kg
               };
               await db.agirlikKayitlari.add(payload);
               await db.syncQueue.add({ table: 'agirlikKayitlari', action: 'INSERT', payload, created_at: Date.now() });
               
               const updatedHayvan = { ...hayvan, guncelAgirlikKg: functionArgs.kg };
               await db.hayvanlar.update(hayvan.id, updatedHayvan);
               await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
               functionResult = `Ağırlık kaydı eklendi. Güncel ağırlık: ${functionArgs.kg} kg.`;

            } else if (functionName === "addReproductionRecord") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Hayvan bulunamadı.");
               
               const payload = {
                 id: uuidv4(),
                 hayvanId: hayvan.id,
                 tarih: parseDateString(functionArgs.tarih),
                 tur: functionArgs.tur,
                 durum: functionArgs.durum,
                 notlar: functionArgs.notlar || ""
               };
               await db.uremeKayitlari.add(payload as any);
               await db.syncQueue.add({ table: 'uremeKayitlari', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Üreme kaydı başarıyla eklendi. (${payload.tur} - ${payload.durum})`;

            } else if (functionName === "addCalfRecord") {
               const hayvan = await db.hayvanlar.filter(h => !!h.kupeNo && h.kupeNo.toLowerCase() === functionArgs.kupeNo.toLowerCase()).first();
               if (!hayvan) throw new Error("Belirtilen küpe numarasına sahip buzağı bulunamadı.");
               
               const payload = {
                 id: uuidv4(),
                 hayvanId: hayvan.id,
                 dogumAgirligiKg: functionArgs.dogumAgirligiKg,
                 suttenKesimHedefTarihi: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                 gunlukAgizSutuLitre: functionArgs.agizSutuLitre,
                 guncelDurum: 'Süt İçiyor'
               };
               await db.buzagiKayitlari.add(payload as any);
               await db.syncQueue.add({ table: 'buzagiKayitlari', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Buzağı büyütme kaydı oluşturuldu. Doğum Ağırlığı: ${payload.dogumAgirligiKg} kg.`;

            } else if (functionName === "addNewFeedType") {
               const payload = {
                 id: uuidv4(),
                 ad: functionArgs.yemAdi,
                 tur: functionArgs.tur,
                 birimFiyat: functionArgs.birimFiyat,
                 stokKg: functionArgs.stokKg,
                 minStokUyariKg: functionArgs.minStokUyariKg
               };
               await db.yemler.add(payload as any);
               await db.syncQueue.add({ table: 'yemler', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Yeni yem türü başarıyla eklendi: ${payload.ad}`;

            } else if (functionName === "createNewGroup") {
               const payload = {
                 id: uuidv4(),
                 ad: functionArgs.grupAdi,
                 tur: functionArgs.tur,
                 aciklama: functionArgs.aciklama || ""
               };
               await db.gruplar.add(payload as any);
               await db.syncQueue.add({ table: 'gruplar', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Yeni grup başarıyla oluşturuldu: ${payload.ad}`;

            } else if (functionName === "addFinancialTransaction") {
               const payload = {
                 id: uuidv4(),
                 tip: functionArgs.tip,
                 kategori: functionArgs.kategori,
                 miktar: functionArgs.miktar,
                 aciklama: functionArgs.aciklama,
                 tarih: parseDateString(functionArgs.tarih)
               };
               await db.ekFinansalIslemler.add(payload as any);
               await db.syncQueue.add({ table: 'ekFinansalIslemler', action: 'INSERT', payload, created_at: Date.now() });
               functionResult = `Finansal kayıt başarıyla işlendi. (${payload.tip}: ${payload.miktar} TL)`;

            } else if (functionName === "assignRationToGroup") {
               const gruplar = await db.gruplar.toArray();
               const hedefGrup = gruplar.find(g => g.ad.toLowerCase().includes(functionArgs.grupAdi.toLowerCase()));
               if (!hedefGrup) throw new Error(`'${functionArgs.grupAdi}' isminde bir grup bulunamadı.`);
               
               const updatedGrup = {
                 ...hedefGrup,
                 rasyonAdi: functionArgs.rasyonAdi,
                 rasyonOzet: functionArgs.rasyonOzet,
                 rasyonTarihi: new Date().toISOString().split('T')[0]
               };
               
               await db.gruplar.update(hedefGrup.id, updatedGrup);
               await db.syncQueue.add({ table: 'gruplar', action: 'UPDATE', payload: updatedGrup, created_at: Date.now() });
               functionResult = `'${updatedGrup.ad}' grubunun rasyonu başarıyla '${updatedGrup.rasyonAdi}' olarak ayarlandı.`;


            } else {
              throw new Error("Bilinmeyen fonksiyon çağrısı.");
            }
          } catch (err: any) {
             functionResult = `İşlem Başarısız: ${err.message}`;
          }

          apiMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: functionResult
          });
        }

        let secondResponse = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: apiMessages,
            temperature: 0.3
          }),
        });

        let secondData = await secondResponse.json();
        if (secondData.choices && secondData.choices.length > 0) {
           responseMessage = secondData.choices[0].message;
        }
      }

      const replyContent = responseMessage.content;
      const finalAssistantMessage: Mesaj = { role: 'assistant', content: replyContent, createdAt: Date.now() };
      currentMessages.push(finalAssistantMessage);

      await db.sohbetler.update(currentChatId, { mesajlar: currentMessages, guncellenmeTarihi: Date.now() });
      const updatedChat = await db.sohbetler.get(currentChatId);
      if (updatedChat) {
         await db.syncQueue.add({ table: 'sohbetler', action: 'UPDATE', payload: updatedChat, created_at: Date.now() });
      }

    } catch (err: any) {
      console.error('Assistant Error:', err);
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ts: number) => {
    if(!ts) return '';
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDateTime = (ts: number) => {
    if(!ts) return '';
    return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' ', ' - ');
  };
  
  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden relative">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 border-r border-earth-200 dark:border-gray-700 bg-nature-50 dark:bg-nature-900/30 flex-col flex-shrink-0">
           <div className="p-4 border-b border-earth-200 dark:border-gray-700">
               <button onClick={handleCreateNewChat} className="w-full flex items-center justify-center space-x-2 bg-[#1b5235] text-white py-3 px-4 rounded-xl font-bold hover:bg-[#143e28] transition shadow-sm">
                  <Plus className="w-5 h-5" />
                  <span>Yeni Sohbet</span>
               </button>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {sohbetler.map(sohbet => (
                   <div key={sohbet.id} onClick={() => setActiveChatId(sohbet.id)} className={`flex items-start justify-between p-3 rounded-xl cursor-pointer transition ${activeChatId === sohbet.id ? 'bg-nature-100 dark:bg-nature-900/50 border border-nature-200 dark:border-nature-800' : 'hover:bg-earth-100 dark:hover:bg-gray-700 border border-transparent'}`}>
                       <div className="flex items-start space-x-3 overflow-hidden">
                           <MessageSquare className={`w-5 h-5 flex-shrink-0 mt-0.5 ${activeChatId === sohbet.id ? 'text-nature-600 dark:text-nature-400' : 'text-earth-500 dark:text-gray-400'}`} />
                           <div className="overflow-hidden">
                               <p className={`font-bold truncate text-sm ${activeChatId === sohbet.id ? 'text-nature-900 dark:text-nature-100' : 'text-earth-800 dark:text-gray-200'}`}>{sohbet.baslik}</p>
                               <p className="text-xs text-earth-500 dark:text-gray-400 mt-1">{formatDateTime(sohbet.olusturulmaTarihi)}</p>
                           </div>
                       </div>
                       <button onClick={(e) => handleDeleteChat(sohbet.id, e)} className="p-1.5 text-earth-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                           <Trash2 className="w-4 h-4" />
                       </button>
                   </div>
               ))}
           </div>
        </div>

        {/* Mobile History Bottom Drawer Modal */}
        {isMobileHistoryOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col justify-end md:hidden animate-in fade-in duration-200">
            <div 
              className="fixed inset-0" 
              onClick={() => setIsMobileHistoryOpen(false)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-4 border-t border-earth-200 dark:border-gray-700 z-10 animate-in slide-in-from-bottom duration-300">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-earth-100 dark:border-gray-700">
                <div className="flex items-center space-x-2 text-earth-900 dark:text-gray-100 font-bold text-base">
                  <MessageSquare className="w-5 h-5 text-earth-700 dark:text-gray-300" />
                  <span>Sohbetler</span>
                </div>
                <button 
                  onClick={() => setIsMobileHistoryOpen(false)}
                  className="p-1 text-earth-500 dark:text-gray-400 hover:bg-earth-100 dark:hover:bg-gray-700 rounded-full transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* New Chat Button */}
              <button 
                onClick={() => {
                  handleCreateNewChat();
                  setIsMobileHistoryOpen(false);
                }} 
                className="w-full flex items-center justify-center space-x-2 bg-[#1b5235] text-white py-3.5 px-4 rounded-xl font-bold hover:bg-[#143e28] transition shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Sohbet</span>
              </button>

              {/* Chat List */}
              <div className="overflow-y-auto space-y-2 max-h-[55vh] pr-1">
                {sohbetler.length === 0 ? (
                  <p className="text-center text-xs text-earth-400 py-6">Henüz bir sohbet geçmişi yok.</p>
                ) : (
                  sohbetler.map(sohbet => (
                    <div 
                      key={sohbet.id} 
                      onClick={() => {
                        setActiveChatId(sohbet.id);
                        setIsMobileHistoryOpen(false);
                      }} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer border transition ${
                        activeChatId === sohbet.id 
                          ? 'bg-blue-50/80 border-blue-200 dark:border-blue-800/50 text-blue-900' 
                          : 'bg-slate-50/70 border-slate-200/80 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <MessageSquare className={`w-5 h-5 flex-shrink-0 ${activeChatId === sohbet.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`} />
                        <div className="overflow-hidden">
                          <p className="font-bold truncate text-sm">{sohbet.baslik}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(sohbet.olusturulmaTarihi)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteChat(sohbet.id, e)} 
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header Bar */}
          <div className="px-4 py-3 border-b border-earth-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between shrink-0">
            <h2 className="text-base md:text-lg font-bold text-earth-900 dark:text-gray-100 text-center flex-1 md:text-left">
              Sohbet
            </h2>
            <div className="flex items-center space-x-1.5 md:hidden">
              <button 
                onClick={() => setIsMobileHistoryOpen(true)}
                className="p-2 text-earth-700 dark:text-gray-300 hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg transition"
                title="Sohbetler"
              >
                <Menu className="w-6 h-6" />
              </button>
              {activeChatId && (
                <button 
                  onClick={(e) => handleDeleteChat(activeChatId, e)}
                  className="p-2 text-earth-700 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Sohbeti Sil"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages & Context Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-earth-50 dark:bg-gray-900">
            
            {/* Empty State when no messages */}
            {displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-6 py-12 my-auto">
                <div className="w-14 h-14 bg-earth-100/80 rounded-full flex items-center justify-center mb-4 text-earth-400">
                  <Sparkles className="w-8 h-8 text-earth-500 dark:text-gray-400" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-earth-900 dark:text-gray-100 mb-2 max-w-md leading-snug">
                  Merhaba! Sürü yönetimi ve hayvanlarınız ile ilgili tüm sorularınızı sorabilirsiniz.
                </h3>
                <p className="text-xs md:text-sm text-earth-500 dark:text-gray-400 max-w-md leading-relaxed">
                  Hayvan verilerinizi, gelir giderinizi, sağlık geçmişini ve sürü performansınızı sormaktan çekinmeyin.
                </p>
              </div>
            )}

            {/* Chat Messages */}
            {displayMessages.filter(m => m.role === 'user' || m.role === 'assistant').map((msg, idx) => (
              <div key={idx} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                
                {msg.role === 'user' && (
                   <div className="flex-shrink-0 p-2 rounded-full bg-earth-200 text-earth-700 dark:text-gray-300">
                     <User className="w-5 h-5" />
                   </div>
                )}
                
                <div className={`max-w-[90%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-nature-600 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 text-earth-800 dark:text-gray-200 rounded-tl-sm'}`}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-earth-900 prose-pre:text-earth-100 prose-th:bg-earth-100 prose-td:border-b prose-table:border-collapse prose-table:w-full">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    {msg.createdAt && (
                        <span className="text-[10px] text-earth-500 dark:text-gray-400 mt-1 px-1 font-medium">{formatTime(msg.createdAt)}</span>
                    )}
                </div>

              </div>
            ))}

            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-4 flex items-center space-x-2 text-earth-500 dark:text-gray-400 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-nature-600 dark:text-nature-400" />
                  <span className="text-sm font-bold animate-pulse text-earth-700 dark:text-gray-300">Analiz ediliyor...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm flex items-center space-x-2 border border-red-200 dark:border-red-800/50">
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions pills */}
          {displayMessages.length === 0 && !activeChatId && (
            <div className="px-4 py-2.5 bg-white dark:bg-gray-800 border-t border-earth-100 dark:border-gray-700 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0">
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleSend(q)}
                  className="px-3.5 py-1.5 bg-earth-50 dark:bg-gray-900 text-earth-700 dark:text-gray-300 border border-earth-200 dark:border-gray-700 rounded-full text-xs font-semibold hover:bg-nature-50 dark:hover:bg-nature-900/30 hover:text-nature-700 hover:border-nature-200 transition whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form Section */}
          <div className="p-3 md:p-4 bg-white dark:bg-gray-800 border-t border-earth-200 dark:border-gray-700 flex-shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative flex items-center"
            >
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder="Yapay zekaya bir soru sorun..."
                className="w-full pl-5 pr-[100px] py-3.5 bg-white dark:bg-gray-800 border border-earth-300 dark:border-gray-600 rounded-2xl md:rounded-full focus:outline-none focus:ring-2 focus:ring-nature-500 focus:border-nature-500 text-earth-900 dark:text-gray-100 text-sm md:text-base disabled:opacity-50 transition shadow-sm"
              />
              <div className="absolute right-2 flex items-center space-x-1">
                <button 
                  type="button" 
                  onClick={toggleListening}
                  title={isListening ? "Dinleniyor... (Kapatmak için tıklayın)" : "Sesli komut için tıklayın"}
                  className={`p-2.5 rounded-full transition shadow-md ${isListening ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' : 'bg-earth-100 hover:bg-earth-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-earth-600 dark:text-gray-300'}`}
                >
                  {isListening ? <MicOff className="w-4.5 h-4.5 md:w-5 md:h-5" /> : <Mic className="w-4.5 h-4.5 md:w-5 md:h-5" />}
                </button>
                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-40 disabled:hover:bg-blue-600 transition shadow-md"
                >
                  <Send className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </button>
              </div>
            </form>
          </div>

        </div>
    </div>
  );
};
export default Assistant;
