import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, Plus, MessageSquare, Trash2, User, Menu, X, Sparkles } from 'lucide-react';
import { db } from '../lib/db';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import type { Sohbet, Mesaj } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SAMPLE_QUESTIONS = [
  "Sürümde toplam kaç hayvan var?",
  "Hangi hayvanlarım gebe?",
  "Yakında doğuracak hayvanlar hangileri?",
  "Kaba yem stoklarım ne durumda?"
];

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
  },
  {
    type: "function",
    function: {
      name: "get_yem_stoklari",
      description: "Depodaki mevcut yem stoklarını, miktarlarını ve kritik seviyede olanları getirir.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sut_verimi",
      description: "Sürünün son 7 günlük toplam süt verimini getirir.",
      parameters: { type: "object", properties: {}, required: [] },
    }
  },
  {
    type: "function",
    function: {
      name: "get_hayvan_detay",
      description: "Belirli bir küpe numarasına sahip hayvanın detaylarını (yaş, tür, durum, ırk) getirir.",
      parameters: { 
        type: "object", 
        properties: {
          kupeNo: { type: "string", description: "Hayvanın küpe numarası (Örn: TR 11)" }
        }, 
        required: ["kupeNo"] 
      },
    }
  },
  {
    type: "function",
    function: {
      name: "get_bugun_yapilacaklar",
      description: "Bugün yapılması gereken işleri (bekleyen aşılar ve yaklaşan doğumlar vb.) özet olarak getirir.",
      parameters: { type: "object", properties: {}, required: [] },
    }
  }
];

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

      const systemPrompt = {
        role: 'system',
        content: `Sen uzman bir zooteknist ve sürü yönetimi asistanısın. Kullanıcının çiftlik verilerine erişim araçların (tools) var. Gerekli durumlarda araçları çağırarak bilgi al ve net, kısa, profesyonel cevaplar ver. Markdown kullanabilirsin.`
      };

      let apiMessages: any[] = [systemPrompt, ...currentMessages.map(m => {
          const msg: any = { role: m.role };
          if (m.content) msg.content = m.content;
          else if (!m.tool_calls) msg.content = "";
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
          if (m.tool_calls) msg.tool_calls = m.tool_calls;
          return msg;
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
          tools: tools,
          temperature: 0.3,
        }),
      });

      let data = await response.json();

      if (!response.ok || !data.choices || data.choices.length === 0) {
        throw new Error(data.error?.message || `API Hatası: ${response.status}`);
      }

      let responseMessage = data.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        apiMessages.push(responseMessage);
        const toolCallMessage: Mesaj = {
           role: 'assistant',
           content: responseMessage.content || '',
           tool_calls: responseMessage.tool_calls,
           createdAt: Date.now()
        };
        currentMessages.push(toolCallMessage);
        
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          let functionResult = "";
        
          if (functionName === "get_hayvan_sayisi") {
            try {
              const hayvanlar = await db.hayvanlar.toArray();
              const inekSayisi = hayvanlar.filter(h => h.tur === 'İnek').length;
              const tosunSayisi = hayvanlar.filter(h => h.tur === 'Tosun').length;
              const bogaSayisi = hayvanlar.filter(h => h.tur === 'Boğa').length;
              const okuzSayisi = hayvanlar.filter(h => h.tur === 'Öküz').length;
              const duveSayisi = hayvanlar.filter(h => h.tur === 'Düve').length;
              const danaSayisi = hayvanlar.filter(h => h.tur === 'Dana').length;
              const buzagiSayisi = hayvanlar.filter(h => h.tur === 'Buzağı').length;
              functionResult = `Toplam ${hayvanlar.length} hayvan. İnek: ${inekSayisi}, Tosun: ${tosunSayisi}, Boğa: ${bogaSayisi}, Öküz: ${okuzSayisi}, Düve: ${duveSayisi}, Dana: ${danaSayisi}, Buzağı: ${buzagiSayisi}.`;
            } catch (error: any) {
               functionResult = "Veritabanı hatası: " + error.message;
            }
          } 
          else if (functionName === "get_gebe_hayvanlar") {
            try {
              const ureme = await db.uremeKayitlari.where('tur').equals('Gebelik Kontrolü').toArray();
              const gebeHayvanIdler = ureme.filter(u => u.durum === 'Gebe').map(u => u.hayvanId);
              if (gebeHayvanIdler.length > 0) {
                const gebeHayvanlar = await db.hayvanlar.where('id').anyOf(gebeHayvanIdler).toArray();
                if (gebeHayvanlar.length > 0) {
                  functionResult = `Şu hayvanlar gebedir: ${gebeHayvanlar.map(h => h.kupeNo).join(', ')}`;
                } else { functionResult = "Kayıtlarda gebe hayvan bulunamadı."; }
              } else { functionResult = "Kayıtlarda gebe hayvan bulunamadı."; }
            } catch (error: any) { functionResult = "Veritabanı hatası: " + error.message; }
          }
          else if (functionName === "get_yem_stoklari") {
            try {
              const yemler = await db.yemler.toArray();
              if (yemler.length > 0) {
                const yemListesi = yemler.map(y => `${y.ad} (${y.tur}): ${y.stokKg} kg (Kritik sınır: ${y.minStokUyariKg} kg)`).join('\n');
                const kritikYemler = yemler.filter(y => y.stokKg <= y.minStokUyariKg);
                functionResult = `Mevcut Yem Stokları:\n${yemListesi}`;
                if (kritikYemler.length > 0) { functionResult += `\n\nDİKKAT: Şu yemler kritik seviyenin altında: ${kritikYemler.map(y => y.ad).join(', ')}`; }
              } else { functionResult = "Depoda kayıtlı yem bulunmamaktadır."; }
            } catch (error: any) { functionResult = "Veritabanı hatası: " + error.message; }
          }
          else if (functionName === "get_sut_verimi") {
            try {
              const now = new Date(); now.setHours(0,0,0,0);
              const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              const sutKayitlari = await db.sutKayitlari.toArray();
              const son7GunSut = sutKayitlari.filter(k => new Date(k.tarih) >= sevenDaysAgo);
              const toplamSut = son7GunSut.reduce((sum, k) => sum + k.litre, 0);
              functionResult = `Sürünün son 7 günde ürettiği toplam süt miktarı: ${toplamSut} Litre'dir. Toplam ${son7GunSut.length} adet sağım kaydı bulunmaktadır.`;
            } catch (error: any) { functionResult = "Veritabanı hatası: " + error.message; }
          }
          else if (functionName === "get_hayvan_detay") {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              const kupeNo = args.kupeNo;
              const hayvanlar = await db.hayvanlar.toArray();
              const hayvan = hayvanlar.find(h => h.kupeNo.toLowerCase().includes(kupeNo.toLowerCase()));
              if (hayvan) {
                const yasMs = Date.now() - new Date(hayvan.dogumTarihi).getTime();
                const yasGun = Math.floor(yasMs / (1000 * 60 * 60 * 24));
                functionResult = `Küpe No: ${hayvan.kupeNo}, Tür: ${hayvan.tur}, Irk: ${hayvan.irk}, Yaş: ${yasGun} gün, Durum: ${hayvan.durum}, Cinsiyet: ${hayvan.cinsiyet}, Güncel Ağırlık: ${hayvan.guncelAgirlikKg} kg.`;
              } else { functionResult = `${kupeNo} numaralı hayvan bulunamadı.`; }
            } catch (error: any) { functionResult = "Araç hatası: " + error.message; }
          }
          else if (functionName === "get_bugun_yapilacaklar") {
            try {
              const now = new Date().getTime();
              const tumAsilar = await db.planlananAsilar.toArray();
              const asilar = tumAsilar.filter(a => a.yapildiMi === false);
              const gecikmisAsilar = asilar.filter(a => new Date(a.planlanaTarih).getTime() < now);
              const uremeler = await db.uremeKayitlari.where('tur').equals('Tohumlama/Aşım').toArray();
              let yaklasanDogumlar = 0;
              for (const u of uremeler) {
                if (u.durum === 'Gebe') {
                  const dogumTarihi = new Date(u.tarih).getTime() + (283 * 24 * 60 * 60 * 1000);
                  const gunKaldı = Math.floor((dogumTarihi - now) / (1000 * 60 * 60 * 24));
                  if (gunKaldı <= 30 && gunKaldı >= -10) yaklasanDogumlar++;
                }
              }
              functionResult = `Şu an sistemde ${gecikmisAsilar.length} adet gecikmiş/bekleyen aşı ve önümüzdeki 30 gün içinde beklenen ${yaklasanDogumlar} adet doğum bulunmaktadır.`;
            } catch (error: any) { functionResult = "Araç hatası: " + error.message; }
          }
          
          const toolResultMessage: Mesaj = { role: 'tool', tool_call_id: toolCall.id, content: functionResult, createdAt: Date.now() };
          currentMessages.push(toolResultMessage);
          
          apiMessages.push({ role: "tool", tool_call_id: toolCall.id, content: functionResult });
        }

        response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "deepseek-chat", messages: apiMessages, temperature: 0.3 }),
        });
        
        data = await response.json();

        if (!response.ok || !data.choices || data.choices.length === 0) {
          throw new Error(data.error?.message || `API Hatası: ${response.status}`);
        }
      }

      const replyContent = data.choices[0].message.content;
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
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white rounded-2xl shadow-sm border border-earth-200 overflow-hidden relative">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 border-r border-earth-200 bg-nature-50 flex-col flex-shrink-0">
           <div className="p-4 border-b border-earth-200">
               <button onClick={handleCreateNewChat} className="w-full flex items-center justify-center space-x-2 bg-[#1b5235] text-white py-3 px-4 rounded-xl font-bold hover:bg-[#143e28] transition shadow-sm">
                  <Plus className="w-5 h-5" />
                  <span>Yeni Sohbet</span>
               </button>
           </div>
           <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {sohbetler.map(sohbet => (
                   <div key={sohbet.id} onClick={() => setActiveChatId(sohbet.id)} className={`flex items-start justify-between p-3 rounded-xl cursor-pointer transition ${activeChatId === sohbet.id ? 'bg-nature-100 border border-nature-200' : 'hover:bg-earth-100 border border-transparent'}`}>
                       <div className="flex items-start space-x-3 overflow-hidden">
                           <MessageSquare className={`w-5 h-5 flex-shrink-0 mt-0.5 ${activeChatId === sohbet.id ? 'text-nature-600' : 'text-earth-500'}`} />
                           <div className="overflow-hidden">
                               <p className={`font-bold truncate text-sm ${activeChatId === sohbet.id ? 'text-nature-900' : 'text-earth-800'}`}>{sohbet.baslik}</p>
                               <p className="text-xs text-earth-500 mt-1">{formatDateTime(sohbet.olusturulmaTarihi)}</p>
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
            <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-4 border-t border-earth-200 z-10 animate-in slide-in-from-bottom duration-300">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-earth-100">
                <div className="flex items-center space-x-2 text-earth-900 font-bold text-base">
                  <MessageSquare className="w-5 h-5 text-earth-700" />
                  <span>Sohbetler</span>
                </div>
                <button 
                  onClick={() => setIsMobileHistoryOpen(false)}
                  className="p-1 text-earth-500 hover:bg-earth-100 rounded-full transition"
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
                          ? 'bg-blue-50/80 border-blue-200 text-blue-900' 
                          : 'bg-slate-50/70 border-slate-200/80 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <MessageSquare className={`w-5 h-5 flex-shrink-0 ${activeChatId === sohbet.id ? 'text-blue-600' : 'text-slate-500'}`} />
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
          <div className="px-4 py-3 border-b border-earth-200 bg-white flex items-center justify-between shrink-0">
            <h2 className="text-base md:text-lg font-bold text-earth-900 text-center flex-1 md:text-left">
              Sohbet
            </h2>
            <div className="flex items-center space-x-1.5 md:hidden">
              <button 
                onClick={() => setIsMobileHistoryOpen(true)}
                className="p-2 text-earth-700 hover:bg-earth-100 rounded-lg transition"
                title="Sohbetler"
              >
                <Menu className="w-6 h-6" />
              </button>
              {activeChatId && (
                <button 
                  onClick={(e) => handleDeleteChat(activeChatId, e)}
                  className="p-2 text-earth-700 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Sohbeti Sil"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages & Context Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-earth-50">
            
            {/* Empty State when no messages */}
            {displayMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-6 py-12 my-auto">
                <div className="w-14 h-14 bg-earth-100/80 rounded-full flex items-center justify-center mb-4 text-earth-400">
                  <Sparkles className="w-8 h-8 text-earth-500" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-earth-900 mb-2 max-w-md leading-snug">
                  Merhaba! Rasyon veya hayvan besleme ile ilgili sorularınızı sorabilirsiniz.
                </h3>
                <p className="text-xs md:text-sm text-earth-500 max-w-md leading-relaxed">
                  Geçmiş rasyonlarınızı, hayvan profillerinizi ve saha gözlemlerinizi sormaktan çekinmeyin.
                </p>
              </div>
            )}

            {/* Chat Messages */}
            {displayMessages.filter(m => m.role === 'user' || m.role === 'assistant').map((msg, idx) => (
              <div key={idx} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                
                {msg.role === 'user' && (
                   <div className="flex-shrink-0 p-2 rounded-full bg-earth-200 text-earth-700">
                     <User className="w-5 h-5" />
                   </div>
                )}
                
                <div className={`max-w-[90%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'bg-nature-600 text-white rounded-tr-sm' : 'bg-white border border-earth-200 text-earth-800 rounded-tl-sm'}`}>
                      <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-earth-900 prose-pre:text-earth-100 prose-th:bg-earth-100 prose-td:border-b prose-table:border-collapse prose-table:w-full">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    {msg.createdAt && (
                        <span className="text-[10px] text-earth-500 mt-1 px-1 font-medium">{formatTime(msg.createdAt)}</span>
                    )}
                </div>

              </div>
            ))}

            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="bg-white border border-earth-200 rounded-2xl rounded-tl-sm p-4 flex items-center space-x-2 text-earth-500 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-nature-600" />
                  <span className="text-sm font-bold animate-pulse text-earth-700">Analiz ediliyor...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center space-x-2 border border-red-200">
                  <span>{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions pills */}
          {displayMessages.length === 0 && !activeChatId && (
            <div className="px-4 py-2.5 bg-white border-t border-earth-100 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0">
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handleSend(q)}
                  className="px-3.5 py-1.5 bg-earth-50 text-earth-700 border border-earth-200 rounded-full text-xs font-semibold hover:bg-nature-50 hover:text-nature-700 hover:border-nature-200 transition whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Form Section */}
          <div className="p-3 md:p-4 bg-white border-t border-earth-200 flex-shrink-0">
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
                className="w-full pl-5 pr-14 py-3.5 bg-white border border-earth-300 rounded-2xl md:rounded-full focus:outline-none focus:ring-2 focus:ring-nature-500 focus:border-nature-500 text-earth-900 text-sm md:text-base disabled:opacity-50 transition shadow-sm"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-40 disabled:hover:bg-blue-600 transition shadow-md"
              >
                <Send className="w-4.5 h-4.5 md:w-5 md:h-5" />
              </button>
            </form>
          </div>

        </div>
    </div>
  );
};
export default Assistant;
