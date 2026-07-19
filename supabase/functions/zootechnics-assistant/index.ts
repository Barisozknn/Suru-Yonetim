// @ts-nocheck
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // DeepSeek API setup
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY is not set');
    }

    const systemPrompt = {
      role: 'system',
      content: `Sen uzman bir zooteknist ve sürü yönetimi asistanısın. 
Kullanıcının çiftlik verilerine erişim araçların (tools) var. Gerekli durumlarda araçları çağırarak bilgi al ve net, kısa, profesyonel cevaplar ver. 
Markdown kullanabilirsin. Kullanıcının sürüsü hakkında genel veya özel bilgi sorulursa her zaman araçları kullan.`
    };

    // Tools definition
    const tools = [
      {
        type: "function",
        function: {
          name: "get_hayvan_sayisi",
          description: "Sürüdeki toplam hayvan sayısını ve türlere göre dağılımını getirir.",
          parameters: { type: "object", properties: {}, required: [] },
        },
      },
      {
        type: "function",
        function: {
          name: "get_gebe_hayvanlar",
          description: "Sürüdeki gebe olan hayvanların küpe numaralarını ve durumlarını getirir.",
          parameters: { type: "object", properties: {}, required: [] },
        },
      }
    ];

    let currentMessages = [systemPrompt, ...messages];

    // İlk İstek
    let response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: currentMessages,
        tools: tools,
        temperature: 0.3,
      }),
    });

    let data = await response.json();

    // Tool çağrısı var mı kontrol et
    if (data.choices && data.choices[0] && data.choices[0].message.tool_calls) {
      const toolCall = data.choices[0].message.tool_calls[0];
      const functionName = toolCall.function.name;
      
      currentMessages.push(data.choices[0].message); // Asistanın tool çağrısı

      let functionResult = "";

      if (functionName === "get_hayvan_sayisi") {
        const { data: hayvanlar, error } = await supabaseClient.from('hayvanlar').select('tur');
        if (error) functionResult = "Veritabanı hatası: " + error.message;
        else {
          const sigirSayisi = hayvanlar.filter((h: any) => h.tur === 'Sığır').length;
          const koyunSayisi = hayvanlar.filter((h: any) => h.tur === 'Koyun').length;
          const keciSayisi = hayvanlar.filter((h: any) => h.tur === 'Keçi').length;
          const buzagiSayisi = hayvanlar.filter((h: any) => h.tur === 'Buzağı').length;
          functionResult = `Toplam ${hayvanlar.length} hayvan. Sığır: ${sigirSayisi}, Koyun: ${koyunSayisi}, Keçi: ${keciSayisi}, Buzağı: ${buzagiSayisi}.`;
        }
      } 
      else if (functionName === "get_gebe_hayvanlar") {
        const { data: ureme, error } = await supabaseClient.from('ureme_kayitlari').select('hayvan_id, detay').eq('olay_turu', 'Gebelik Kontrolü');
        if (error) functionResult = "Veritabanı hatası: " + error.message;
        else {
          const gebeHayvanIdler = ureme.filter((u: any) => u.detay === 'Pozitif (Gebe)').map((u: any) => u.hayvan_id);
          
          if (gebeHayvanIdler.length > 0) {
            const { data: gebeHayvanlar, error: hError } = await supabaseClient.from('hayvanlar').select('kupe_no').in('id', gebeHayvanIdler);
            if (hError) functionResult = "Hayvan bilgisi alınamadı.";
            else {
              functionResult = `Şu hayvanlar gebedir: ${gebeHayvanlar.map((h: any) => h.kupe_no).join(', ')}`;
            }
          } else {
             functionResult = "Kayıtlarda gebe hayvan bulunamadı.";
          }
        }
      }

      currentMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: functionResult
      });

      // İkinci istek (Tool cevabıyla beraber)
      response = await fetch("https://api.deepseek.com/chat/completions", {
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

      data = await response.json();
    }

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
