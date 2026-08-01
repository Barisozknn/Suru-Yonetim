import type { GunlukNotu } from '../types';

export const analyzeDiaryNotes = async (notes: GunlukNotu[]) => {
  // Projenin ortam değişkenlerinden veya localStorage'dan DeepSeek API anahtarını alıyoruz.
  const aiApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || localStorage.getItem('deepseekApiKey');
  
  if (!aiApiKey) {
    throw new Error('Lütfen sisteminize geçerli bir DeepSeek API Anahtarı tanımlayın (.env dosyası veya localStorage üzerinden).');
  }

  if (!notes || notes.length === 0) {
    throw new Error('Analiz edilecek not bulunamadı.');
  }

  const prompt = `Aşağıda çiftlik yöneticisinin günlük notları bulunmaktadır. Lütfen bu notları dikkatlice okuyup bir veteriner ve ziraat mühendisi (sürü yöneticisi) gözüyle profesyonel bir özet ve değerlendirme raporu çıkar. Maddeler halinde önemli olayları vurgula ve gelecek için tavsiyelerde bulun.\n\nNotlar:\n${notes.map(n => `- Tarih: ${n.tarih} | Not: ${n.metin}`).join('\n')}`;

  // DeepSeek API yapılandırması
  const apiUrl = 'https://api.deepseek.com/chat/completions';
  const model = 'deepseek-chat';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Sen uzman bir sürü yöneticisi ve veteriner hekimsin.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("AI Analiz Hatası:", error);
    throw new Error('DeepSeek analiz servisiyle iletişim kurulamadı. API anahtarınızı kontrol edin.');
  }
};
