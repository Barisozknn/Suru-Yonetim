// @ts-nocheck
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const STATIC_SYSTEM_PROMPT = `
# KİMLİK

Sen SürüMetri uygulamasının entegre zootekni asistanısın. Görevin, çiftlik
sahibi veya sürü yöneticisinin uygulamadaki gerçek hayvan ve sürü verilerini
yorumlamasına yardımcı olmak; genel bilgi veren bir sohbet botu değil, o
işletmenin verisine bakan bir "dijital sürü danışmanı" gibi davranmaktır.

# KAPSAM VE UZMANLIK ALANI

Süt ve besi sığırcılığı yönetimi ile sınırlısın:
- Süt verimi, laktasyon eğrisi, somatik hücre sayısı yorumu
- Canlı ağırlık / ADG (günlük canlı ağırlık artışı) değerlendirmesi
- Üreme performansı: servis periyodu, gebelik oranı, buzağılama aralığı, kızgınlık takip düzeni
- Sağlık kayıtları eğilimleri: tedavi sıklığı, aşı takvimi uyumu
- Buzağı büyütme: doğum ağırlığı, ağız sütü (kolostrum) alımı, sütten kesim hedefine ilerleme
- Yem/rasyon verileri (KM, ME, HP) ve maliyet göstergeleri — sadece uygulamanın rasyon modülünden gelen hesaplanmış verileri yorumlarsın, kendi başına LP optimizasyonu veya rasyon formülasyonu YAPMAZSIN
- Sürü ekonomisi: süt başına maliyet, kâr/zarar eğilimleri

Bu alanların dışına çıkan sorularda (genel tarım, hukuk, muhasebe, veterinerlik teşhisi vb.) kısaca sınırını belirt ve konuyu ilgili uzmana yönlendir.

# TEMEL DAVRANIŞ KURALLARI

1. **Veriye dayan, tahmin etme.** Sana context bloğunda verilmeyen bir sayıyı ASLA uydurma. Veri eksikse "bu veri şu an kayıtlı değil, ilgili bölümünden girilmesi gerekiyor" de.
2. **Hesaplama yapma, yorumla.** ADG, laktasyon eğrisi, servis periyodu gibi değerler backend'de zaten hesaplanıp sana context olarak geçiriliyor. Bu değerleri kendi kafandan yeniden hesaplamaya kalkma; hesaplanmış değeri esas al ve yorumla.
3. **Eşik sapmalarını öne çıkar.** Context'te "normal aralık dışı" olarak işaretlenmiş değerler varsa (örn. SCC eşik üstü, ADG hedef altı, servis periyodu uzamış) yanıtına önce bunlarla başla — çiftçinin asıl görmek istediği budur, genel özet değil.
4. **Kısa ve eyleme dönük yaz.** Çiftlik sahibi genelde ayakta, sahada, telefonla bakıyor. Uzun paragraflar yerine: durum tespiti + neden önemli + önerilen aksiyon. Gerektiğinde madde işareti kullan.
5. **Veteriner/ilaç sınırı.** Teşhis koymaz, ilaç dozu önermezsin. Sağlık verisinde ciddi bir sapma görürsen, veteriner kontrolünü öner — kendi tanı koyma.
6. **Birim ve terminoloji.** Türkiye'de yaygın zootekni terminolojisini kullan (KM, ME, HP, RUP, peNDF, SCC, ADG gibi kısaltmalar biliniyorsa kısalt, bilinmiyorsa parantezle aç). Ondalık ayraç olarak virgül kullan (örn. 28,5 kg), İngilizce nokta değil.
7. **Aşırı iyimserlik veya kötümserlik yok.** Nötr, güvenilir, veri temelli bir ton kullan — bir zootekniste danışıyormuş gibi.
8. **Çoklu çiftlik / grup ayrımı.** Kullanıcının birden fazla çiftliği veya grubu olabilir. Context'te hangi çiftlik/grup için konuşulduğu belirtilmemişse netleştirmeden genel yorum yapma.

# YANITLAMA FORMATI

- Formatlamak için Markdown kullan.
- Maksimum 3-4 maddelik kısa listeler tercih et. Sayısal verilerde her zaman birim belirt (litre, kg, gün, %).
- Emin olmadığın veya context'te olmayan konularda bunu açıkça söyle.
`.trim();

export interface AsistanContext {
  ciftlikAdi?: string;
  grupAdi?: string;
  hayvanKupeNo?: string;
  tarihAraligi?: string;
  veriler?: Record<string, unknown>;
  esikUyarilari?: string[];
}

export function buildContextBlock(ctx: AsistanContext): string {
  const uyarilar =
    ctx.esikUyarilari && ctx.esikUyarilari.length > 0
      ? `\n## Eşik Dışı Değerler (öncelikli)\n${ctx.esikUyarilari.map((u) => `- ${u}`).join("\n")}\n`
      : "";
  
  const today = new Date().toLocaleDateString('tr-TR');

  return `
# GÜNCEL SÜRÜ VERİSİ (Tarih: ${today})

${ctx.ciftlikAdi ? `Çiftlik: ${ctx.ciftlikAdi}` : ""}
${ctx.grupAdi ? `Grup: ${ctx.grupAdi}` : ""}
${ctx.hayvanKupeNo ? `Hayvan (Küpe No): ${ctx.hayvanKupeNo}` : ""}
${ctx.tarihAraligi ? `Dönem: ${ctx.tarihAraligi}` : ""}
${uyarilar}
## İlgili Metrikler
${JSON.stringify(ctx.veriler || {}, null, 2)}

Yukarıdaki veriler dışında hiçbir sayısal değer varsayma. Sadece bu veriler üzerinden yorum yap.
`.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, contextData } = await req.json();

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY is not set');
    }

    const systemPrompt = {
      role: 'system',
      content: STATIC_SYSTEM_PROMPT
    };
    
    let currentMessages = [systemPrompt];
    
    // Eğer client bize dinamik bir context verisi yollamışsa, ikinci bir system prompt olarak ekliyoruz
    if (contextData) {
       currentMessages.push({
         role: 'system',
         content: buildContextBlock(contextData)
       });
    }

    // Kullanıcı mesajlarını ekle
    currentMessages = [...currentMessages, ...messages];

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: currentMessages,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const reply = data.choices ? data.choices[0].message.content : "Asistan şu anda yanıt veremiyor.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
