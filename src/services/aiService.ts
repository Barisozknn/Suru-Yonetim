import { db } from '../lib/db';
import type { GunlukNotu } from '../types';
import { calculateAgeInDays } from '../utils/calfCalculations';

export const analyzeDiaryNotes = async (notes: GunlukNotu[]) => {
  const aiApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || localStorage.getItem('deepseekApiKey');
  
  if (!aiApiKey) {
    throw new Error('Lütfen sisteminize geçerli bir DeepSeek API Anahtarı tanımlayın (.env dosyası veya localStorage üzerinden).');
  }

  if (!notes || notes.length === 0) {
    throw new Error('Analiz edilecek not bulunamadı.');
  }

  // 1. Extract all mentioned tags (@kupeNo)
  const mentionedTags = new Set<string>();
  notes.forEach(note => {
    const matches = note.metin.match(/@[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+/g);
    if (matches) {
      matches.forEach(m => mentionedTags.add(m.substring(1).trim()));
    }
  });

  // 2. Fetch context for these tags
  let contextInfo = '';
  if (mentionedTags.size > 0) {
    const tagsArray = Array.from(mentionedTags);
    // Since we don't know exact casing or partial match, we fetch all and filter, or use case-insensitive
    const allAnimals = await db.hayvanlar.toArray();
    
    const matchedAnimals = allAnimals.filter(a => 
      tagsArray.some(tag => a.kupeNo.toLowerCase().includes(tag.toLowerCase()))
    );

    if (matchedAnimals.length > 0) {
      contextInfo = `\n[BAĞLAM: Bahsedilen Hayvanlar Hakkında Bilgiler]\n`;
      matchedAnimals.forEach(a => {
        const yasGun = calculateAgeInDays(a.dogumTarihi);
        const yasMetin = yasGun > 365 ? `${Math.floor(yasGun/365)} yaş` : `${Math.floor(yasGun/30)} aylık`;
        contextInfo += `- @${a.kupeNo}: ${a.tur} (${a.irk}), ${a.cinsiyet}, ${yasMetin}, Durum: ${a.durum}, Ağırlık: ${a.guncelAgirlikKg}kg.\n`;
      });
    }
  }

  const prompt = `Aşağıda çiftlik yöneticisinin günlük notları bulunmaktadır. Lütfen bu notları dikkatlice okuyup bir veteriner ve ziraat mühendisi (sürü yöneticisi) gözüyle profesyonel bir özet ve değerlendirme raporu çıkar. Maddeler halinde önemli olayları vurgula, aralarındaki olası bağlantıları (hastalık, verim düşüşü vb.) tespit et ve gelecek hafta için net bir "Yapılacaklar / Takip Edilecekler" listesi çıkar.\n${contextInfo}\n[NOTLAR]:\n${notes.map(n => `- Tarih: ${n.tarih} | Not: ${n.metin}`).join('\n')}`;

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
          { role: 'system', content: 'Sen uzman bir sürü yöneticisi ve veteriner hekimsin. Raporlarını her zaman markdown formatında ver ve anlaşılır, uygulanabilir tavsiyeler sun.' },
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
