import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';
import { Mic, MicOff, Save, Trash2, Calendar, FileText, CheckCircle2, Edit2, X, Paperclip, Sparkles, Hash, Loader2, Download } from 'lucide-react';
import { analyzeDiaryNotes } from '../services/aiService';
import ReactMarkdown from 'react-markdown';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const FarmDiary: React.FC = () => {
  const { activeCiftlikId } = useStore();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [noteText, setNoteText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // YENİ EKLENEN STATE'LER
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recognitionRef = useRef<any>(null);

  const notes = useLiveFarmQuery(() => {
    let collection = db.gunlukNotlari.where('tarih').equals(selectedDate);
    
    // Etiket filtresi varsa dexie'nin filter özelliğini kullanalım
    return collection
      .reverse()
      .sortBy('olusturulmaTarihi')
      .then(res => {
        if (tagFilter) {
          return res.filter(note => note.etiketler?.includes(tagFilter));
        }
        return res;
      });
  }, [selectedDate, tagFilter]);

  // AI Analizi için o ayki tüm notları çekelim
  const monthlyNotes = useLiveFarmQuery(() => {
    const monthPrefix = selectedDate.substring(0, 7); // YYYY-MM
    return db.gunlukNotlari
      .filter(n => n.tarih.startsWith(monthPrefix))
      .toArray();
  }, [selectedDate]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'tr-TR';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setNoteText(prev => prev + (prev.endsWith(' ') ? '' : ' ') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (!recognitionRef.current) {
        alert('Tarayıcınız ses tanıma özelliğini desteklemiyor. Lütfen güncel bir Chrome veya Edge tarayıcı kullanın.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const extractTags = (text: string) => {
    const regex = /#[\wçğıöşüÇĞİÖŞÜ]+/g;
    const matches = text.match(regex);
    return matches ? Array.from(new Set(matches)) : [];
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setMediaFiles(prev => [...prev, base64]);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!noteText.trim() && mediaFiles.length === 0) return;
    
    setSaveStatus('saving');
    try {
      const etiketler = extractTags(noteText);

      if (editingNoteId) {
        const payload = { metin: noteText.trim(), medyalar: mediaFiles, etiketler };
        await db.gunlukNotlari.update(editingNoteId, payload);
        await db.syncQueue.add({ table: 'gunlukNotlari', action: 'UPDATE', payload: { id: editingNoteId, ...payload }, created_at: Date.now() });
      } else {
        const payload = {
          id: uuidv4(),
          ciftlikId: activeCiftlikId || 'default',
          tarih: selectedDate,
          metin: noteText.trim(),
          medyalar: mediaFiles,
          etiketler: etiketler,
          olusturulmaTarihi: Date.now()
        };
        await db.gunlukNotlari.add(payload as any);
        await db.syncQueue.add({ table: 'gunlukNotlari', action: 'INSERT', payload, created_at: Date.now() });
      }
      
      setNoteText('');
      setMediaFiles([]);
      setEditingNoteId(null);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Not kaydedilemedi:', error);
      setSaveStatus('idle');
    }
  };

  const handleEditClick = (note: any) => {
    setEditingNoteId(note.id);
    setNoteText(note.metin);
    setMediaFiles(note.medyalar || []);
  };
  
  const cancelEdit = () => {
    setEditingNoteId(null);
    setNoteText('');
    setMediaFiles([]);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu notu silmek istediğinize emin misiniz?')) {
      await db.gunlukNotlari.delete(id);
      await db.syncQueue.add({ table: 'gunlukNotlari', action: 'DELETE', payload: { id }, created_at: Date.now() });
    }
  };

  const handleAIAnalyze = async () => {
    if (!monthlyNotes || monthlyNotes.length === 0) {
      alert('Seçili ayda analiz edilecek hiçbir not bulunamadı!');
      return;
    }
    
    setShowAnalysisModal(true);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const sonuc = await analyzeDiaryNotes(monthlyNotes);
      setAnalysisResult(sonuc);
    } catch (err: any) {
      setAnalysisResult('Hata: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Not metni render edildiğinde tag'leri ve mention'ları renklendirme
  const parseNoteText = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((word, i) => {
      if (word.match(/^#[\wçğıöşüÇĞİÖŞÜ]+/)) {
        return <span key={i} className="text-nature-600 font-bold cursor-pointer hover:bg-nature-100 px-1 rounded transition-colors" onClick={() => setTagFilter(word)}>{word}</span>;
      }
      if (word.match(/^@[\w]+/)) {
        return <span key={i} className="text-blue-600 font-bold cursor-pointer hover:underline bg-blue-50 px-1 rounded" title="Hayvan Profili" onClick={() => alert(word + ' küpeli hayvanın profili buraya bağlanacak.')}>{word}</span>;
      }
      return <span key={i}>{word}</span>;
    });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-earth-900 dark:text-gray-100 flex items-center gap-3">
            <Mic className="w-8 h-8 text-nature-600" />
            Çiftlik Günlüğü
          </h1>
          <p className="text-earth-500 dark:text-gray-400 mt-1">
            Gördüklerinizi sesli kaydedin, fotoğraf ekleyin, AI ile analiz edin.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-earth-200 dark:border-gray-700">
          <Calendar className="w-5 h-5 text-earth-400 ml-2" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none bg-transparent focus:ring-0 text-earth-900 dark:text-gray-100 font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sol Kolon: Not Giriş Alanı */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-earth-50 dark:bg-gray-800/50 border-b border-earth-100 dark:border-gray-700 flex justify-between items-center">
              <span className="font-bold text-earth-700 dark:text-gray-300">{editingNoteId ? 'Notu Düzenle' : 'Yeni Not Ekle'}</span>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white text-earth-500 border border-earth-200 hover:bg-earth-100 rounded-full dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 transition-colors"
                  title="Fotoğraf/Belge Ekle"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                />

                <button 
                  onClick={toggleRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                    isRecording 
                      ? 'bg-red-100 text-red-600 border border-red-200 animate-pulse' 
                      : 'bg-white text-earth-700 border border-earth-200 hover:bg-earth-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  {isRecording ? (
                    <><MicOff className="w-4 h-4" /> Dinleniyor... Tıkla Kapat</>
                  ) : (
                    <><Mic className="w-4 h-4 text-nature-600" /> Sesli Yazdır</>
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Örn: Bugün #hastalık belirtisi olan @TR123 e ilaç verdik..."
                className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-nature-500 resize-none text-earth-900 dark:text-gray-100 mb-2"
              />

              {/* Medya Önizleme Alanı */}
              {mediaFiles.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {mediaFiles.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img src={src} alt="eklenen" className="h-16 w-16 object-cover rounded-lg border border-earth-200" />
                      <button 
                        onClick={() => removeMedia(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-earth-50 dark:bg-gray-800/50 border-t border-earth-100 dark:border-gray-700 flex justify-between items-center gap-3">
              <span className="text-xs text-earth-400 hidden sm:inline-block">İpucu: #etiket veya @küpeno kullanın</span>
              
              <div className="flex gap-2">
                {editingNoteId && (
                  <button 
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-6 py-2.5 bg-earth-200 text-earth-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-earth-300 transition-colors"
                  >
                    <X className="w-5 h-5" /> İptal
                  </button>
                )}
                <button 
                  onClick={handleSave}
                  disabled={(!noteText.trim() && mediaFiles.length === 0) || saveStatus === 'saving'}
                  className="flex items-center gap-2 px-6 py-2.5 bg-nature-600 text-white rounded-xl font-bold hover:bg-nature-700 transition-colors disabled:opacity-50"
                >
                  {saveStatus === 'saved' ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                  {saveStatus === 'saved' ? 'Kaydedildi' : (editingNoteId ? 'Güncelle' : 'Kaydet')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: O Günün Notları */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 p-6 h-full min-h-[400px] flex flex-col">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-earth-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-nature-600" />
                {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} Notları
              </h3>

              <div className="flex items-center gap-2">
                {tagFilter && (
                  <div className="flex items-center gap-1 bg-nature-100 text-nature-800 px-3 py-1 rounded-full text-xs font-bold">
                    <Hash className="w-3 h-3" /> {tagFilter}
                    <button onClick={() => setTagFilter('')} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                )}

                <button 
                  onClick={handleAIAnalyze}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-xl font-bold text-xs transition-colors border border-purple-200"
                  title="Seçili ayın notlarını yapay zekaya analiz ettir"
                >
                  <Sparkles className="w-4 h-4" /> Ayı Analiz Et
                </button>
              </div>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {!notes || notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-earth-400 py-12">
                  <FileText className="w-12 h-12 opacity-30 mb-3" />
                  <p className="text-center text-sm">{tagFilter ? 'Bu etikete ait not bulunamadı.' : 'Bu tarihte hiç not alınmamış.'}</p>
                </div>
              ) : (
                notes.map((note: any) => (
                  <div key={note.id} className="p-4 bg-earth-50 dark:bg-gray-900 rounded-xl border border-earth-100 dark:border-gray-700 group relative">
                    <p className="text-sm text-earth-800 dark:text-gray-200 whitespace-pre-wrap">{parseNoteText(note.metin)}</p>
                    
                    {note.medyalar && note.medyalar.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {note.medyalar.map((src: string, i: number) => (
                          <img key={i} src={src} alt="Not eki" className="h-20 w-20 object-cover rounded-lg border border-earth-200" />
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-xs text-earth-400 font-medium">
                        {new Date(note.olusturulmaTarihi).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditClick(note)}
                          className="text-earth-400 hover:text-earth-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Notu Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(note.id)}
                          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Notu Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Yapay Zeka Analiz Modalı */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-earth-100 dark:border-gray-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20 rounded-t-2xl">
              <h3 className="font-black text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {new Date(selectedDate).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} - AI Aylık Raporu
              </h3>
              <button onClick={() => setShowAnalysisModal(false)} className="text-purple-400 hover:text-purple-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12 text-purple-600">
                  <Loader2 className="w-12 h-12 animate-spin mb-4" />
                  <p className="font-bold">Notlarınız yapay zekaya okunup analiz ediliyor...</p>
                  <p className="text-sm opacity-70 mt-2">Bu işlem yaklaşık 10-15 saniye sürebilir.</p>
                </div>
              ) : analysisResult ? (
                <div className="prose prose-purple dark:prose-invert max-w-none prose-sm sm:prose-base">
                  <ReactMarkdown>
                    {analysisResult}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
            
            <div className="p-4 border-t border-earth-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 rounded-b-2xl">
              {analysisResult && !isAnalyzing && (
                <button 
                  onClick={() => {
                    const blob = new Blob([analysisResult], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Aylik_Rapor_${selectedDate.substring(0, 7)}.md`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="px-6 py-2 bg-nature-600 text-white rounded-xl font-bold hover:bg-nature-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Raporu İndir
                </button>
              )}
              <button 
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2 bg-earth-200 text-earth-800 rounded-xl font-bold hover:bg-earth-300 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FarmDiary;
