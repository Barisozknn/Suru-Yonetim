import React, { useState } from 'react';
import { X, Save, Heart, Info, CalendarCheck, ShieldAlert, GitMerge, Droplet, Activity, Droplets } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { UremeKaydi, UremeKaydiTur, Hayvan, BuzagiKaydi } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  hayvanId: string;
  onClose: () => void;
  existing?: UremeKaydi;
}

const TUR_ICONS: Record<UremeKaydiTur, React.ReactNode> = {
  'Kızgınlık': <Heart className="w-4 h-4" />,
  'Tohumlama/Aşım': <Info className="w-4 h-4" />,
  'Gebelik Kontrolü': <ShieldAlert className="w-4 h-4" />,
  'Kuruya Çıkarma': <CalendarCheck className="w-4 h-4" />,
  'Doğum': <Droplets className="w-4 h-4" />,
  'Doğal Aşım': <GitMerge className="w-4 h-4" />,
  'Sperma Alımı': <Droplet className="w-4 h-4" />,
  'Damızlık Muayenesi': <Activity className="w-4 h-4" />,
};

const TUR_COLORS: Record<UremeKaydiTur, string> = {
  'Kızgınlık': 'bg-pink-100 text-pink-700 border-pink-300',
  'Tohumlama/Aşım': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-300',
  'Gebelik Kontrolü': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-300',
  'Kuruya Çıkarma': 'bg-orange-100 text-orange-700 border-orange-300',
  'Doğum': 'bg-green-100 text-green-700 border-green-300',
  'Doğal Aşım': 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-purple-300',
  'Sperma Alımı': 'bg-teal-100 text-teal-700 border-teal-300',
  'Damızlık Muayenesi': 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

const ReproductionModal: React.FC<Props> = ({ hayvanId, onClose, existing }) => {
  const today = new Date().toISOString().split('T')[0];
  const [tarih, setTarih] = useState(existing?.tarih || today);
  const [tur, setTur] = useState<UremeKaydiTur>((existing?.tur as string) === 'Tohumlama' ? 'Tohumlama/Aşım' : (existing?.tur || 'Kızgınlık'));
  const [durum, setDurum] = useState<'Gebe' | 'Boş' | 'Belirsiz'>(existing?.durum || 'Gebe');
  const [notlar, setNotlar] = useState(existing?.notlar || '');
  const [detaylar, setDetaylar] = useState<Record<string, any>>({
    tohumlamaYontemi: 'Yapay',
    ...existing?.detaylar
  });
  const [maliyet, setMaliyet] = useState(existing?.maliyet?.toString() || '');
  
  const erkekHayvanlar = useLiveFarmQuery(
    () => db.hayvanlar.where('tur').anyOf(['Boğa', 'Tosun']).toArray(),
    []
  ) || [];
  
  const disiHayvan = useLiveFarmQuery(() => db.hayvanlar.get(hayvanId), [hayvanId]);
  
  const [yeniBuzagiKupeNo, setYeniBuzagiKupeNo] = useState('');
  const [yeniBuzagiCinsiyet, setYeniBuzagiCinsiyet] = useState<'Erkek' | 'Dişi'>('Dişi');
  const [yeniBuzagiDogumAgirligi, setYeniBuzagiDogumAgirligi] = useState('');
  
  const [erkekSearchTerm, setErkekSearchTerm] = useState('');
  const [isErkekDropdownOpen, setIsErkekDropdownOpen] = useState(false);
  const [dogumDegerlendirmesi, setDogumDegerlendirmesi] = useState<string>(existing?.detaylar?.dogumDegerlendirmesi || '');
  
  const [saving, setSaving] = useState(false);

  const handleDetayChange = (key: string, value: string) => {
    setDetaylar(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const finalDetaylar = { ...detaylar };
    if (tur === 'Doğum' && dogumDegerlendirmesi) {
      finalDetaylar.dogumDegerlendirmesi = dogumDegerlendirmesi;
    }

    const payload: UremeKaydi = {
      id: existing?.id || uuidv4(),
      hayvanId,
      tarih,
      tur,
      durum: tur === 'Gebelik Kontrolü' ? durum : undefined,
      notlar,
      maliyet: maliyet ? Number(maliyet) : undefined,
      detaylar: Object.keys(finalDetaylar).length > 0 ? finalDetaylar : undefined,
    };

    const action = existing ? 'UPDATE' : 'INSERT';
    if (existing) {
      await db.uremeKayitlari.put(payload);
    } else {
      await db.uremeKayitlari.add(payload);
    }
    await db.syncQueue.add({ table: 'uremeKayitlari', action, payload, created_at: Date.now() });

    // Doğum olayı ise ve yeni buzağı küpe no girildiyse otomatik hayvan oluştur
    if (tur === 'Doğum' && !existing && yeniBuzagiKupeNo) {
      const anne = await db.hayvanlar.get(hayvanId);
      if (anne) {
        const yeniHayvanId = uuidv4();
        const yeniHayvan: Hayvan = {
          id: yeniHayvanId,
          kupeNo: yeniBuzagiKupeNo,
          tur: 'Buzağı',
          cinsiyet: yeniBuzagiCinsiyet,
          irk: anne.irk,
          durum: 'Aktif',
          dogumTarihi: tarih,
          anneKupeNo: anne.kupeNo,
          grupId: null,
          guncelAgirlikKg: yeniBuzagiDogumAgirligi ? Number(yeniBuzagiDogumAgirligi) : 0,
          notlar: [
            dogumDegerlendirmesi ? `Doğum Şekli: ${dogumDegerlendirmesi}` : '',
            yeniBuzagiDogumAgirligi ? `Doğum Ağırlığı: ${yeniBuzagiDogumAgirligi} kg` : ''
          ].filter(Boolean).join(' | ') || undefined,
        };
        await db.hayvanlar.add(yeniHayvan);
        await db.syncQueue.add({ table: 'hayvanlar', action: 'INSERT', payload: yeniHayvan, created_at: Date.now() });

        const yeniBuzagiKaydi: BuzagiKaydi = {
          id: uuidv4(),
          hayvanId: yeniHayvanId,
          agizSutuVerildi: false,
          dogumAgirligiKg: yeniBuzagiDogumAgirligi ? Number(yeniBuzagiDogumAgirligi) : undefined,
        };
        await db.buzagiKayitlari.add(yeniBuzagiKaydi);
        await db.syncQueue.add({ table: 'buzagiKayitlari', action: 'INSERT', payload: yeniBuzagiKaydi, created_at: Date.now() });
      }
    }

    if (tur === 'Tohumlama/Aşım' && detaylar.tohumlamaYontemi === 'Elde' && detaylar.eldeAsimBogaId && disiHayvan) {
      const erkekHayvan = await db.hayvanlar.get(detaylar.eldeAsimBogaId);
      if (erkekHayvan) {
        // Erkeğe de Doğal Aşım kaydı ekle
        const erkekKayit: UremeKaydi = {
          id: uuidv4(),
          hayvanId: erkekHayvan.id,
          tarih,
          tur: 'Doğal Aşım',
          notlar: `Dişi: ${disiHayvan.kupeNo}`,
          detaylar: {
            disiKupeNo: disiHayvan.kupeNo,
            disiId: disiHayvan.id
          }
        };
        await db.uremeKayitlari.add(erkekKayit);
        await db.syncQueue.add({ table: 'uremeKayitlari', action: 'INSERT', payload: erkekKayit, created_at: Date.now() });

        // Erkek Tosun ise Boğa yap
        if (erkekHayvan.tur === 'Tosun') {
          await db.hayvanlar.update(erkekHayvan.id, { tur: 'Boğa' });
          const guncelErkek = await db.hayvanlar.get(erkekHayvan.id);
          if (guncelErkek) {
            await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: guncelErkek, created_at: Date.now() });
          }
        }
      }
    }

    if (navigator.onLine) {
      const { processSyncQueue } = await import('../services/syncService');
      processSyncQueue();
    }
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-earth-900/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-pink-50 dark:bg-pink-900/20 rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-xl font-black text-earth-900 dark:text-gray-100">Üreme Olayı</h2>
            <p className="text-xs text-earth-500 dark:text-gray-400">{existing ? 'Kaydı Düzenle' : 'Yeni Kayıt Ekle'}</p>
          </div>
          <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Tür Seçimi */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-2 block">Olay Türü</label>
            <div className="flex flex-wrap gap-2">
              {(['Kızgınlık', 'Tohumlama/Aşım', 'Gebelik Kontrolü', 'Kuruya Çıkarma', 'Doğum'] as UremeKaydiTur[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTur(t); setDetaylar({}); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-semibold text-sm transition ${
                    tur === t ? TUR_COLORS[t] + ' ring-2 ring-offset-1 ring-current' : 'bg-earth-50 dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-earth-200 dark:border-gray-700 hover:bg-earth-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {TUR_ICONS[t]}
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tarih */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Tarih</label>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500" />
          </div>

          {/* Tür'e özel alanlar */}
          {tur === 'Kızgınlık' && (
            <div>
              <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Gözlem Yöntemi</label>
              <select value={detaylar.gozlemYontemi || ''} onChange={e => handleDetayChange('gozlemYontemi', e.target.value)}
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500">
                <option value="">Seçiniz...</option>
                <option value="Görsel (Atlama)">Görsel (Atlama)</option>
                <option value="Kızgınlık Bantı/Aktivitometre">Kızgınlık Bantı/Aktivitometre</option>
                <option value="Kanama">Kanama</option>
              </select>
            </div>
          )}

          {tur === 'Tohumlama/Aşım' && (
            <>
              <div>
                <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Yöntem</label>
                <select 
                  value={detaylar.tohumlamaYontemi || 'Yapay'} 
                  onChange={e => handleDetayChange('tohumlamaYontemi', e.target.value)}
                  className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Yapay">Yapay Tohumlama</option>
                  <option value="Elde">Elde Aşım</option>
                </select>
              </div>

              {detaylar.tohumlamaYontemi === 'Elde' ? (
                <div>
                  <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Boğa / Tosun Seçimi (Arama Özellikli)</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 font-medium"
                      placeholder="Küpe No veya tür ile ara..."
                      value={erkekSearchTerm}
                      onChange={(e) => {
                        setErkekSearchTerm(e.target.value);
                        setIsErkekDropdownOpen(true);
                        handleDetayChange('eldeAsimBogaId', '');
                      }}
                      onFocus={() => setIsErkekDropdownOpen(true)}
                    />
                    {isErkekDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsErkekDropdownOpen(false)}
                        ></div>
                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {erkekHayvanlar
                            .filter(e => e.kupeNo.toLowerCase().includes(erkekSearchTerm.toLowerCase()) || e.tur.toLowerCase().includes(erkekSearchTerm.toLowerCase()))
                            .map(e => (
                              <div
                                key={e.id}
                                className="p-3 hover:bg-earth-50 dark:hover:bg-gray-700 cursor-pointer text-earth-900 dark:text-gray-100 border-b border-earth-100 dark:border-gray-700 last:border-0"
                                onClick={() => {
                                  handleDetayChange('eldeAsimBogaId', e.id);
                                  setErkekSearchTerm(`${e.kupeNo} (${e.tur} - ${e.irk})`);
                                  setIsErkekDropdownOpen(false);
                                }}
                              >
                                {e.kupeNo} <span className="text-earth-500 dark:text-gray-400 text-sm ml-2">({e.tur} - {e.irk})</span>
                              </div>
                            ))}
                          {erkekHayvanlar.filter(e => e.kupeNo.toLowerCase().includes(erkekSearchTerm.toLowerCase()) || e.tur.toLowerCase().includes(erkekSearchTerm.toLowerCase())).length === 0 && (
                             <div className="p-3 text-earth-500 dark:text-gray-400 text-sm text-center">Sonuç bulunamadı.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Sperma / Boğa Bilgisi</label>
                    <input type="text" value={detaylar.spermaBogaBilgisi || ''} onChange={e => handleDetayChange('spermaBogaBilgisi', e.target.value)}
                      placeholder="Örn: Holstein - 123456" className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Teknisyen / Veteriner</label>
                    <input type="text" value={detaylar.teknisyen || ''} onChange={e => handleDetayChange('teknisyen', e.target.value)}
                      placeholder="Ad Soyad" className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500" />
                  </div>
                </>
              )}
            </>
          )}

          {tur === 'Gebelik Kontrolü' && (
            <div>
              <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Sonuç</label>
              <select value={durum} onChange={e => setDurum(e.target.value as any)}
                className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500">
                <option value="Gebe">Gebe</option>
                <option value="Boş">Boş</option>
                <option value="Belirsiz">Belirsiz</option>
              </select>
            </div>
          )}

          {tur === 'Doğum' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Doğum Değerlendirmesi</label>
                <select value={dogumDegerlendirmesi} onChange={e => setDogumDegerlendirmesi(e.target.value)}
                  className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500">
                  <option value="">Seçiniz...</option>
                  <option value="Sağlıklı">Sağlıklı</option>
                  <option value="Güç Doğum">Güç Doğum</option>
                  <option value="Ölü Doğum">Ölü Doğum</option>
                  <option value="Düşük">Düşük</option>
                </select>
              </div>

              {!existing && dogumDegerlendirmesi !== 'Ölü Doğum' && dogumDegerlendirmesi !== 'Düşük' && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 space-y-4">
              <h4 className="font-bold text-green-800 flex items-center space-x-2">
                <Droplets className="w-5 h-5" />
                <span>Otomatik Buzağı Kaydı (İsteğe Bağlı)</span>
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Buzağı Küpe No</label>
                  <input type="text" value={yeniBuzagiKupeNo} onChange={e => setYeniBuzagiKupeNo(e.target.value)}
                    placeholder="TR..." className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Cinsiyet</label>
                  <select value={yeniBuzagiCinsiyet} onChange={e => setYeniBuzagiCinsiyet(e.target.value as 'Erkek'|'Dişi')}
                    className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="Dişi">Dişi</option>
                    <option value="Erkek">Erkek</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Doğum Ağırlığı</label>
                  <input type="number" value={yeniBuzagiDogumAgirligi} onChange={e => setYeniBuzagiDogumAgirligi(e.target.value)}
                    placeholder="kg" className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            </div>
              )}
            </div>
          )}

          {/* Açıklama/Notlar */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Notlar</label>
            <textarea value={notlar} onChange={e => setNotlar(e.target.value)} rows={3}
              placeholder="Eklemek istediğiniz notlar..."
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 resize-none" />
          </div>

          {/* Maliyet */}
          <div>
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300 mb-1 block">Maliyet (₺) — İsteğe Bağlı</label>
            <input type="number" min={0} value={maliyet} onChange={e => setMaliyet(e.target.value)}
              placeholder="Örn: 300"
              className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500" />
          </div>
        </div>

        <div className="p-4 border-t border-earth-200 dark:border-gray-700 flex justify-end space-x-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-earth-600 dark:text-gray-400 font-bold hover:bg-earth-100 dark:hover:bg-gray-700 rounded-lg transition">İptal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-pink-600 text-white rounded-lg font-bold hover:bg-pink-700 disabled:opacity-50 transition">
            <Save className="w-5 h-5" />
            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReproductionModal;
