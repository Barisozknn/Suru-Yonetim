import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { AgirlikKaydi, Hayvan } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Scale, TrendingUp, Edit2, Trash2, Check, X } from 'lucide-react';

interface Props {
  hayvan: Hayvan;
}

const WeightRecords: React.FC<Props> = ({ hayvan }) => {
  const kayitlar = useLiveFarmQuery(() => 
    db.agirlikKayitlari.where('hayvanId').equals(hayvan.id).sortBy('tarih')
  ) || [];

  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [kg, setKg] = useState<number | ''>('');

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AgirlikKaydi>>({});

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu tartım kaydını silmek istediğinize emin misiniz?')) {
      await db.agirlikKayitlari.delete(id);
      await db.syncQueue.add({
        table: 'agirlikKayitlari',
        action: 'DELETE',
        payload: { id },
        created_at: Date.now()
      });
    }
  };

  const startEdit = (k: AgirlikKaydi) => {
    setEditingId(k.id);
    setEditForm(k);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editForm.id || !editForm.kg || !editForm.tarih) return;
    const payload = editForm as AgirlikKaydi;
    await db.agirlikKayitlari.update(editForm.id, payload);
    await db.syncQueue.add({
      table: 'agirlikKayitlari',
      action: 'UPDATE',
      payload,
      created_at: Date.now()
    });
    
    // Update animal's current weight
    await db.hayvanlar.update(hayvan.id, { guncelAgirlikKg: Number(payload.kg) });
    await db.syncQueue.add({
      table: 'hayvanlar',
      action: 'UPDATE',
      payload: { ...hayvan, guncelAgirlikKg: Number(payload.kg) },
      created_at: Date.now()
    });

    setEditingId(null);
    setEditForm({});
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kg || kg <= 0) return;

    const payload: AgirlikKaydi = {
      id: uuidv4(),
      hayvanId: hayvan.id,
      tarih,
      kg: Number(kg)
    };

    await db.agirlikKayitlari.add(payload);
    await db.syncQueue.add({
      table: 'agirlikKayitlari',
      action: 'INSERT',
      payload,
      created_at: Date.now()
    });

    // Update animal's current weight
    await db.hayvanlar.update(hayvan.id, { guncelAgirlikKg: Number(kg) });
    await db.syncQueue.add({
      table: 'hayvanlar',
      action: 'UPDATE',
      payload: { ...hayvan, guncelAgirlikKg: Number(kg) },
      created_at: Date.now()
    });

    setKg('');
  };

  const calculateADG = () => {
    if (kayitlar.length < 2) return null;
    const sorted = [...kayitlar].sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime());
    const last = sorted[0];
    const prev = sorted[1];

    const days = (new Date(last.tarih).getTime() - new Date(prev.tarih).getTime()) / (1000 * 3600 * 24);
    if (days === 0) return 0; // Same day protection

    return ((last.kg - prev.kg) / days).toFixed(2);
  };

  const adg = calculateADG();

  return (
    <div className="space-y-6">
      {/* Form and ADG Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handleAdd} className="bg-earth-50 p-4 rounded-xl border border-earth-200 shadow-sm">
          <h3 className="font-bold text-earth-800 flex items-center mb-4">
            <Scale className="w-5 h-5 mr-2 text-nature-600" />
            Yeni Tartım Ekle
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-earth-600 mb-1">Tarih</label>
              <input required type="date" value={tarih} onChange={e => setTarih(e.target.value)} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-earth-600 mb-1">Ağırlık (kg)</label>
              <input required type="number" step="0.1" value={kg} onChange={e => setKg(Number(e.target.value))} placeholder="Örn: 550" className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none text-sm" />
            </div>
            <button type="submit" className="w-full py-2 bg-nature-600 text-white font-bold rounded-lg hover:bg-nature-700 transition">Kaydet</button>
          </div>
        </form>

        <div className="bg-nature-50 p-4 rounded-xl border border-nature-200 shadow-sm flex flex-col justify-center items-center text-center">
          <TrendingUp className="w-12 h-12 text-nature-500 mb-2 opacity-50" />
          <h3 className="font-bold text-earth-600 uppercase text-xs">Günlük Canlı Ağırlık Artışı (GCAA)</h3>
          {adg !== null ? (
            <div className="mt-2">
              <span className="text-4xl font-black text-nature-700">{adg}</span>
              <span className="text-sm font-bold text-earth-500 ml-1">kg/gün</span>
              <p className="text-xs text-earth-500 mt-2">Son iki tartım baz alınmıştır.</p>
            </div>
          ) : (
            <p className="text-sm text-earth-500 mt-2 italic">Hesaplama için en az 2 tartım girmelisiniz.</p>
          )}
        </div>
      </div>

      {/* Chart */}
      {kayitlar.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-sm">
          <h3 className="font-bold text-earth-800 mb-6">Büyüme Eğrisi</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kayitlar} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <Line type="monotone" dataKey="kg" stroke="#2b6b39" strokeWidth={3} dot={{ r: 4, fill: '#2b6b39' }} activeDot={{ r: 6 }} />
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <XAxis dataKey="tarih" tickFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')} stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                  labelFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')}
                  formatter={(value: any) => [`${value} kg`, 'Ağırlık']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {kayitlar.length > 0 && (
        <div className="bg-white rounded-xl border border-earth-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-earth-50 border-b border-earth-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="font-bold text-earth-800">Geçmiş Tartım Kayıtları</h3>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-earth-600 font-medium">Tarih Filtresi:</span>
              <input 
                type="date" 
                value={filterStartDate}
                onChange={e => setFilterStartDate(e.target.value)}
                className="p-1 border border-earth-300 rounded focus:ring-1 focus:ring-nature-500 outline-none text-xs"
              />
              <span className="text-earth-400">-</span>
              <input 
                type="date" 
                value={filterEndDate}
                onChange={e => setFilterEndDate(e.target.value)}
                className="p-1 border border-earth-300 rounded focus:ring-1 focus:ring-nature-500 outline-none text-xs"
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
            <table className="w-full text-left text-sm text-earth-600">
              <thead className="bg-earth-100 text-earth-700 font-semibold border-b border-earth-200 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Ağırlık (kg)</th>
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
                    <tr key={k.id} className="bg-nature-50/50">
                      <td className="p-2"><input type="date" value={editForm.tarih} onChange={e => setEditForm({...editForm, tarih: e.target.value})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2"><input type="number" step="0.1" value={editForm.kg} onChange={e => setEditForm({...editForm, kg: Number(e.target.value)})} className="w-full p-1 border rounded text-xs outline-none" /></td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end space-x-1">
                          <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-100 rounded transition" title="Kaydet"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition" title="İptal"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={k.id} className="hover:bg-earth-50/50 transition">
                      <td className="p-3 font-medium text-earth-900">{new Date(k.tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="p-3 font-bold text-nature-600">{k.kg} kg</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end space-x-1">
                          <button onClick={() => startEdit(k)} className="p-1.5 text-earth-500 hover:text-nature-600 hover:bg-nature-50 rounded transition" title="Düzenle"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(k.id)} className="p-1.5 text-earth-500 hover:text-red-600 hover:bg-red-50 rounded transition" title="Sil"><Trash2 className="w-4 h-4" /></button>
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

export default WeightRecords;
