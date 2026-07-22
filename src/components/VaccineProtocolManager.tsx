import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { AsiProtokolu, AsiUygulama, PlanlananAsi } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, X, Save, Syringe, ChevronDown, ChevronUp, Users, Edit2 } from 'lucide-react';

const VaccineProtocolManager: React.FC = () => {
  const protokoller = useLiveFarmQuery(() => db.asiProtokolleri.toArray()) || [];
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [atamaModalId, setAtamaModalId] = useState<string | null>(null);

  // Form state
  const [ad, setAd] = useState('');
  const [hedefTur, setHedefTur] = useState<AsiProtokolu['hedefTur']>('Tümü');
  const [uygulamalar, setUygulamalar] = useState<AsiUygulama[]>([{ ad: '', gunFarki: 0 }]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => { 
    setAd(''); 
    setHedefTur('Tümü'); 
    setUygulamalar([{ ad: '', gunFarki: 0 }]); 
    setShowForm(false); 
    setEditingId(null);
  };

  const handleEdit = (protokol: AsiProtokolu) => {
    setAd(protokol.ad);
    setHedefTur(protokol.hedefTur);
    setUygulamalar(JSON.parse(JSON.stringify(protokol.uygulamalar || [{ ad: '', gunFarki: 0 }]))); // Deep copy
    setEditingId(protokol.id);
    setShowForm(true);
    setExpandedId(null);
  };

  const handleSaveProtokol = async () => {
    if (!ad.trim() || uygulamalar.some(u => !u.ad.trim())) {
      alert('Protokol adı ve tüm uygulama adları zorunludur.');
      return;
    }
    setSaving(true);
    const payload: AsiProtokolu = { id: editingId || uuidv4(), ad, hedefTur, uygulamalar };
    
    if (editingId) {
      await db.asiProtokolleri.put(payload);
      await db.syncQueue.add({ table: 'asiProtokolleri', action: 'UPDATE', payload, created_at: Date.now() });
    } else {
      await db.asiProtokolleri.add(payload);
      await db.syncQueue.add({ table: 'asiProtokolleri', action: 'INSERT', payload, created_at: Date.now() });
    }
    
    setSaving(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu protokolü silmek istediğinizden emin misiniz?')) return;
    await db.asiProtokolleri.delete(id);
    await db.syncQueue.add({ table: 'asiProtokolleri', action: 'DELETE', payload: { id }, created_at: Date.now() });
  };

  const generatePlanlananAsilar = (hayvan: typeof hayvanlar[0], protokol: AsiProtokolu): PlanlananAsi[] => {
    const asilar: PlanlananAsi[] = [];
    (protokol.uygulamalar || []).forEach(u => {
      let tekrarSayisi = 1;
      
      if (u.tekrarGun && u.tekrarGun > 0) {
        if (u.surekliTekrar) {
          tekrarSayisi = 50; // Sığır ömrü için güvenli üst limit (ömür boyu simülasyonu)
        } else if (u.tekrarSayisi && u.tekrarSayisi > 0) {
          tekrarSayisi = u.tekrarSayisi;
        } else {
          tekrarSayisi = 2; // Eğer sayı belirtilmediyse default 1 tekrar (+1 = 2)
        }
      }

      for (let i = 0; i < tekrarSayisi; i++) {
        const tarih = new Date(hayvan.dogumTarihi);
        // İlk uygulama doğumdan + gunFarki
        tarih.setDate(tarih.getDate() + u.gunFarki);
        
        // Sonrakiler her tekrarGun günde bir eklenir
        if (i > 0 && u.tekrarGun) {
          tarih.setDate(tarih.getDate() + (u.tekrarGun * i));
        }

        asilar.push({
          id: uuidv4(),
          hayvanId: hayvan.id,
          hayvanKupeNo: hayvan.kupeNo,
          protokolAd: protokol.ad,
          asiAd: u.tekrarGun && i > 0 ? `${u.ad} (Tekrar ${i})` : u.ad,
          planlanaTarih: tarih.toISOString().split('T')[0],
          yapildiMi: false,
          maliyet: u.maliyet,
        });
      }
    });
    return asilar;
  };

  const handleAtaHayvana = async (protokol: AsiProtokolu, hayvanId: string) => {
    const hayvan = hayvanlar.find(h => h.id === hayvanId);
    if (!hayvan) return;

    const planlananlar = generatePlanlananAsilar(hayvan, protokol);

    await db.planlananAsilar.bulkAdd(planlananlar);
    alert(`${planlananlar.length} aşı tarihi "${hayvan.kupeNo}" için planlandı!`);
    setAtamaModalId(null);
  };

  const handleAtaGruba = async (protokol: AsiProtokolu, grupId: string) => {
    let grupHayvanlari = hayvanlar.filter(h => h.durum === 'Aktif'); // Sadece aktif hayvanlar
    let grupAd = 'Bütün Sürü';

    if (grupId !== 'all') {
      const grup = gruplar.find(g => g.id === grupId);
      if (!grup) return;
      grupHayvanlari = grupHayvanlari.filter(h => h.grupId === grupId);
      grupAd = grup.ad;
    }

    // Protokolün hedef türüne göre filtrele (örneğin sadece Buzağılar)
    if (protokol.hedefTur !== 'Tümü') {
      grupHayvanlari = grupHayvanlari.filter(h => h.tur === protokol.hedefTur);
    }

    if (grupHayvanlari.length === 0) { alert('Bu kapsamda uygun aktif hayvan bulunamadı.'); return; }

    const tumPlanlananlar: PlanlananAsi[] = [];
    for (const hayvan of grupHayvanlari) {
      tumPlanlananlar.push(...generatePlanlananAsilar(hayvan, protokol));
    }
    await db.planlananAsilar.bulkAdd(tumPlanlananlar);
    alert(`${tumPlanlananlar.length} aşı tarihi "${grupAd}" kapsamındaki uygun hayvanlar için planlandı!`);
    setAtamaModalId(null);
  };

  return (
    <div className="w-full h-full">
      <div className="bg-white rounded-2xl w-full h-full shadow-sm border border-earth-200 flex flex-col">

        <div className="p-4 border-b border-earth-200 flex justify-between items-center bg-nature-50 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Syringe className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-black text-earth-900">Aşı Protokolleri</h2>
              <p className="text-xs text-earth-500">Şablon oluştur ve hayvanlara/gruplara ata</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Protokol Listesi */}
          {protokoller.map(p => (
            <div key={p.id} className="border border-earth-200 rounded-xl overflow-hidden">
              <div className="flex justify-between items-center p-3 bg-earth-50 cursor-pointer hover:bg-earth-100 transition"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                <div>
                  <span className="font-bold text-earth-900">{p.ad}</span>
                  <span className="ml-2 text-xs text-earth-500 bg-white border border-earth-200 px-2 py-0.5 rounded-full">{p.hedefTur}</span>
                  <span className="ml-2 text-xs text-earth-400">{(p.uygulamalar || []).length} uygulama</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={e => { e.stopPropagation(); setAtamaModalId(p.id); }}
                    className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
                    <Users className="w-3.5 h-3.5" />
                    <span>Ata</span>
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleEdit(p); }}
                    className="p-1.5 text-earth-400 hover:text-blue-500 transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                    className="p-1.5 text-earth-400 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === p.id ? <ChevronUp className="w-4 h-4 text-earth-500" /> : <ChevronDown className="w-4 h-4 text-earth-500" />}
                </div>
              </div>

              {expandedId === p.id && (
                <div className="p-3 bg-white">
                  <div className="space-y-1">
                    {(p.uygulamalar || []).map((u, i) => (
                      <div key={i} className="flex items-center space-x-3 text-sm">
                        <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span className="font-medium text-earth-800">{u.ad}</span>
                        <span className="text-earth-500">— Doğumdan {u.gunFarki}. gün</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Atama Modal */}
              {atamaModalId === p.id && (
                <div className="p-3 bg-blue-50 border-t border-blue-200 space-y-3">
                  <p className="text-xs font-bold text-blue-700">Protokolü Ata:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-earth-600 font-semibold block mb-1">Tek Hayvana</label>
                      <select onChange={e => e.target.value && handleAtaHayvana(p, e.target.value)}
                        className="w-full text-sm border border-earth-300 rounded-lg p-1.5">
                        <option value="">Hayvan seç...</option>
                        {hayvanlar.filter(h => h.durum === 'Aktif').map(h => (
                          <option key={h.id} value={h.id}>{h.kupeNo} — {h.irk}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-earth-600 font-semibold block mb-1">Gruba Toplu</label>
                      <select onChange={e => e.target.value && handleAtaGruba(p, e.target.value)}
                        className="w-full text-sm border border-earth-300 rounded-lg p-1.5">
                        <option value="">Grup seç...</option>
                        <option value="all">Bütün Gruplar (Sürü)</option>
                        {gruplar.map(g => (
                          <option key={g.id} value={g.id}>{g.ad}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button onClick={() => setAtamaModalId(null)} className="text-xs text-earth-500 hover:underline">İptal</button>
                </div>
              )}
            </div>
          ))}

          {protokoller.length === 0 && !showForm && (
            <div className="text-center py-8 text-earth-400">
              <Syringe className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Henüz protokol yok. Yeni bir tane ekleyin.</p>
            </div>
          )}

          {/* Yeni / Düzenle Protokol Formu */}
          {showForm && (
            <div className="border-2 border-blue-300 rounded-xl p-3 sm:p-4 bg-blue-50 space-y-3 w-full max-w-full overflow-hidden shadow-sm">
              <h3 className="font-bold text-blue-800">{editingId ? 'Protokolü Düzenle' : 'Yeni Protokol'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={ad} onChange={e => setAd(e.target.value)} placeholder="Protokol adı (örn: Buzağı 3'lü Karma)"
                  className="col-span-1 sm:col-span-2 p-2 border border-earth-300 rounded-lg text-sm bg-white" />
                <select value={hedefTur} onChange={e => setHedefTur(e.target.value as AsiProtokolu['hedefTur'])}
                  className="p-2 border border-earth-300 rounded-lg text-sm bg-white">
                  <option value="Tümü">Tümü</option>
                  <option value="İnek">İnek</option>
                  <option value="Tosun">Tosun</option>
                  <option value="Boğa">Boğa</option>
                  <option value="Öküz">Öküz</option>
                  <option value="Dana">Dana</option>
                  <option value="Düve">Düve</option>
                  <option value="Buzağı">Buzağı</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-earth-700 uppercase">Uygulamalar</label>
                {uygulamalar.map((u, i) => (
                  <div key={i} className="p-3 bg-white border border-blue-200 rounded-xl space-y-3 relative shadow-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-blue-700 w-5">{i + 1}.</span>
                      <input value={u.ad} onChange={e => { const arr = [...uygulamalar]; arr[i].ad = e.target.value; setUygulamalar(arr); }}
                        placeholder="Aşı adı" className="flex-1 p-2 border border-earth-300 rounded-lg text-sm" />
                      {uygulamalar.length > 1 && (
                        <button onClick={() => setUygulamalar(uygulamalar.filter((_, j) => j !== i))} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 items-center text-xs">
                      <div className="flex items-center space-x-1.5 bg-earth-50 p-2 rounded-lg border border-earth-200">
                        <span className="text-earth-600 font-semibold whitespace-nowrap">Doğumdan</span>
                        <input type="number" min={0} value={u.gunFarki} onChange={e => { const arr = [...uygulamalar]; arr[i].gunFarki = parseInt(e.target.value)||0; setUygulamalar(arr); }}
                          className="w-14 p-1 border border-earth-300 rounded text-center font-bold text-nature-700 bg-white" />
                        <span className="text-earth-600 font-semibold whitespace-nowrap">gün sonra</span>
                      </div>
                      
                      <div className="flex items-center space-x-1.5 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex-wrap">
                        <span className="text-earth-600 font-semibold whitespace-nowrap">Tekrar:</span>
                        <input type="number" min={0} placeholder="Gün" value={u.tekrarGun || ''} onChange={e => { const arr = [...uygulamalar]; arr[i].tekrarGun = parseInt(e.target.value) || undefined; setUygulamalar(arr); }}
                          className="w-14 p-1 border border-blue-300 rounded text-center font-bold text-blue-700 bg-white placeholder:text-blue-300" />
                        <span className="text-earth-600 font-semibold whitespace-nowrap">günde bir</span>

                        {(u.tekrarGun || 0) > 0 && (
                          <div className="flex items-center space-x-1.5 mt-1 w-full pt-1 border-t border-blue-200/60">
                            <label className="flex items-center space-x-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-blue-200">
                              <input type="checkbox" checked={u.surekliTekrar || false} onChange={e => { const arr = [...uygulamalar]; arr[i].surekliTekrar = e.target.checked; setUygulamalar(arr); }} className="w-3 h-3 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-700">Sürekli</span>
                            </label>
                            {!u.surekliTekrar && (
                              <div className="flex items-center space-x-1">
                                <span className="text-earth-400">veya</span>
                                <input type="number" min={1} placeholder="Adet" value={u.tekrarSayisi || ''} onChange={e => { const arr = [...uygulamalar]; arr[i].tekrarSayisi = parseInt(e.target.value) || undefined; setUygulamalar(arr); }}
                                  className="w-12 p-1 border border-earth-300 rounded text-center bg-white" />
                                <span className="text-earth-500">kez</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 bg-earth-50 p-2 rounded-lg border border-earth-200">
                        <span className="text-earth-600 font-semibold whitespace-nowrap">Maliyet:</span>
                        <div className="relative flex-1">
                          <input type="number" min={0} step="0.01" value={u.maliyet || ''} onChange={e => { const arr = [...uygulamalar]; arr[i].maliyet = parseFloat(e.target.value) || undefined; setUygulamalar(arr); }}
                            className="w-full p-1 pl-5 border border-earth-300 rounded text-xs bg-white font-semibold text-earth-800" placeholder="0.00" />
                          <span className="absolute left-1.5 top-1 text-earth-400 font-bold text-xs">₺</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => setUygulamalar([...uygulamalar, { ad: '', gunFarki: 0 }])}
                  className="flex items-center space-x-1 text-xs text-blue-600 hover:underline font-bold">
                  <Plus className="w-3.5 h-3.5" /><span>Uygulama Ekle</span>
                </button>
              </div>

              <div className="flex space-x-2 pt-2">
                <button onClick={resetForm} className="px-4 py-1.5 text-earth-600 text-sm font-semibold hover:bg-earth-100 rounded-lg transition">İptal</button>
                <button onClick={handleSaveProtokol} disabled={saving}
                  className="flex items-center space-x-1 px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                  <Save className="w-4 h-4" /><span>Kaydet</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-earth-200">
          <button onClick={() => setShowForm(true)} disabled={showForm}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition">
            <Plus className="w-4 h-4" /><span>Yeni Protokol</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaccineProtocolManager;
