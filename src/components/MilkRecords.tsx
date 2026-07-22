import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { SutKaydi, Hayvan } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Droplet, AlertTriangle, Edit2, Trash2, Check, X } from 'lucide-react';

interface Props {
  hayvan: Hayvan;
}

const MilkRecords: React.FC<Props> = ({ hayvan }) => {
  const kayitlar = useLiveFarmQuery(() => 
    db.sutKayitlari.where('hayvanId').equals(hayvan.id).sortBy('tarih')
  ) || [];

  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [litre, setLitre] = useState<number | ''>('');
  const [yagYuzde, setYagYuzde] = useState<number | ''>('');
  const [proteinYuzde, setProteinYuzde] = useState<number | ''>('');
  const [laktozYuzde, setLaktozYuzde] = useState<number | ''>('');
  const [somatikHucre, setSomatikHucre] = useState<number | ''>('');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SutKaydi>>({});

  const saglikOlaylari = useLiveFarmQuery(() => 
    db.saglikOlaylari.where('hayvanId').equals(hayvan.id).toArray()
  ) || [];

  const isInArinma = (sutTarihiStr: string) => {
    const sutTime = new Date(sutTarihiStr).getTime();
    for (const olay of saglikOlaylari) {
      if (olay.arinmaSuresiGun > 0) {
        const olayTime = new Date(olay.tarih).getTime();
        const bitisTime = olayTime + olay.arinmaSuresiGun * 24 * 60 * 60 * 1000;
        if (sutTime >= olayTime && sutTime <= bitisTime) {
          return true;
        }
      }
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu süt kaydını silmek istediğinize emin misiniz?')) {
      await db.sutKayitlari.delete(id);
      await db.syncQueue.add({
        table: 'sutKayitlari',
        action: 'DELETE',
        payload: { id },
        created_at: Date.now()
      });
    }
  };

  const startEdit = (k: SutKaydi) => {
    setEditingId(k.id);
    setEditForm(k);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.id || !editForm.litre || !editForm.tarih) return;
    const payload = editForm as SutKaydi;
    await db.sutKayitlari.update(editForm.id, payload);
    await db.syncQueue.add({
      table: 'sutKayitlari',
      action: 'UPDATE',
      payload,
      created_at: Date.now()
    });
    setEditingId(null);
    setEditForm({});
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!litre || litre <= 0) return;

    if (isInArinma(tarih)) {
       const onay = window.confirm("DİKKAT: Bu hayvanın seçilen tarihte aktif ilaç arınma süresi (kalıntı riski) bulunmaktadır. Sütü insan tüketimine uygun değildir! Yine de kaydetmek istiyor musunuz?");
       if (!onay) return;
    }

    const payload: SutKaydi = {
      id: uuidv4(),
      hayvanId: hayvan.id,
      tarih,
      litre: Number(litre),
      yagYuzde: yagYuzde ? Number(yagYuzde) : undefined,
      proteinYuzde: proteinYuzde ? Number(proteinYuzde) : undefined,
      laktozYuzde: laktozYuzde ? Number(laktozYuzde) : undefined,
      somatikHucre: somatikHucre ? Number(somatikHucre) : undefined
    };

    await db.sutKayitlari.add(payload);
    await db.syncQueue.add({
      table: 'sutKayitlari',
      action: 'INSERT',
      payload,
      created_at: Date.now()
    });

    setLitre('');
    setYagYuzde('');
    setProteinYuzde('');
    setLaktozYuzde('');
    setSomatikHucre('');
  };

  const formatTarih = (val: string) => {
    const d = new Date(val);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Form */}
      <form onSubmit={handleAdd} className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
        {isInArinma(tarih) && (
          <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4 flex items-center space-x-2 text-sm font-bold border border-red-200 dark:border-red-800/50">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Seçili tarihte hayvan arınma süresindedir! Süt satışa/tüketime uygun değildir.</span>
          </div>
        )}
        <h3 className="font-bold text-blue-900 flex items-center mb-4">
          <Droplet className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          Süt Sağım Kaydı Ekle
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-blue-800 mb-1">Tarih</label>
            <input required type="date" value={tarih} onChange={e => setTarih(e.target.value)} className="w-full p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 mb-1">Litre</label>
            <input required type="number" step="0.1" min="0" value={litre} onChange={e => setLitre(Number(e.target.value))} placeholder="Örn: 25.5" className="w-full p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 mb-1">Yağ (%) <span className="text-blue-500 font-normal">opsiyonel</span></label>
            <input type="number" step="0.1" min="0" max="10" value={yagYuzde} onChange={e => setYagYuzde(Number(e.target.value))} placeholder="Örn: 3.8" className="w-full p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 mb-1">Protein (%) <span className="text-blue-500 font-normal">opsiyonel</span></label>
            <input type="number" step="0.1" min="0" max="10" value={proteinYuzde} onChange={e => setProteinYuzde(Number(e.target.value))} placeholder="Örn: 3.2" className="w-full p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 mb-1">Laktoz (%) <span className="text-blue-500 font-normal">opsiyonel</span></label>
            <input type="number" step="0.1" min="0" max="10" value={laktozYuzde} onChange={e => setLaktozYuzde(Number(e.target.value))} placeholder="Örn: 4.7" className="w-full p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-blue-800 mb-1">Somatik Hücre <span className="text-blue-500 font-normal">opsiyonel</span></label>
            <input type="number" min="0" value={somatikHucre} onChange={e => setSomatikHucre(Number(e.target.value))} placeholder="Örn: 150000" className="w-full p-2 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">Kaydet</button>
        </div>
      </form>

      {/* Chart */}
      {kayitlar.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-bold text-earth-800 dark:text-gray-200 mb-6">Laktasyon Eğrisi</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kayitlar} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="litre" name="Süt Verimi (L)" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <XAxis dataKey="tarih" tickFormatter={formatTarih} stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  labelFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')}
                  formatter={(value: any) => [`${value} Litre`, 'Süt Verimi']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-earth-500 dark:text-gray-400 italic bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl">
          Bu hayvana ait henüz süt kaydı bulunmuyor.
        </div>
      )}

      {kayitlar.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-earth-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-earth-50 dark:bg-gray-900 border-b border-earth-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-earth-800 dark:text-gray-200">Geçmiş Süt Kayıtları</h3>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-earth-600 dark:text-gray-400 font-medium">Tarih Filtresi:</span>
              <input 
                type="date" 
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="p-1 border border-earth-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
              />
              <span className="text-earth-400">-</span>
              <input 
                type="date" 
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="p-1 border border-earth-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
              />
              {(filterStartDate || filterEndDate) && (
                <button 
                  onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                  className="text-xs text-red-500 hover:text-red-700 ml-2 font-medium"
                >
                  Temizle
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
            <table className="w-full text-left text-sm text-earth-600 dark:text-gray-400">
              <thead className="bg-earth-100 dark:bg-gray-800 text-earth-700 dark:text-gray-300 font-semibold border-b border-earth-200 dark:border-gray-700 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Miktar (L)</th>
                  <th className="p-3">Yağ (%)</th>
                  <th className="p-3">Protein (%)</th>
                  <th className="p-3">Laktoz (%)</th>
                  <th className="p-3">SHS</th>
                  <th className="p-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-earth-100">
                {[...kayitlar]
                  .filter(k => {
                    if (filterStartDate && k.tarih < filterStartDate) return false;
                    if (filterEndDate && k.tarih > filterEndDate) return false;
                    return true;
                  })
                  .reverse()
                  .map(k => editingId === k.id ? (
                    <tr key={k.id} className="bg-blue-50/50">
                      <td className="p-2"><input type="date" value={editForm.tarih} onChange={e => setEditForm({...editForm, tarih: e.target.value})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2"><input type="number" step="0.1" value={editForm.litre} onChange={e => setEditForm({...editForm, litre: Number(e.target.value)})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2"><input type="number" step="0.1" value={editForm.yagYuzde || ''} onChange={e => setEditForm({...editForm, yagYuzde: Number(e.target.value)})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2"><input type="number" step="0.1" value={editForm.proteinYuzde || ''} onChange={e => setEditForm({...editForm, proteinYuzde: Number(e.target.value)})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2"><input type="number" step="0.1" value={editForm.laktozYuzde || ''} onChange={e => setEditForm({...editForm, laktozYuzde: Number(e.target.value)})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2"><input type="number" value={editForm.somatikHucre || ''} onChange={e => setEditForm({...editForm, somatikHucre: Number(e.target.value)})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end space-x-1">
                          <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-100 rounded transition" title="Kaydet"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 rounded transition" title="İptal"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={k.id} className="hover:bg-earth-50/50 transition">
                      <td className="p-3 font-medium text-earth-900 dark:text-gray-100">{new Date(k.tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{k.litre} L</td>
                      <td className="p-3">{k.yagYuzde ? `%${k.yagYuzde}` : '-'}</td>
                      <td className="p-3">{k.proteinYuzde ? `%${k.proteinYuzde}` : '-'}</td>
                      <td className="p-3">{k.laktozYuzde ? `%${k.laktozYuzde}` : '-'}</td>
                      <td className="p-3">{k.somatikHucre ? k.somatikHucre.toLocaleString('tr-TR') : '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end space-x-1">
                          <button onClick={() => startEdit(k)} className="p-1.5 text-earth-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(k.id)} className="p-1.5 text-earth-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Sil"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default MilkRecords;
