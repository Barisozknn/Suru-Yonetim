import React, { useState } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';
import GroupMilkModal from './GroupMilkModal';
import GroupAnimalManagerModal from './GroupAnimalManagerModal';
import { parseRasyonCost } from '../utils/dashboardCalculations';

const GroupManager: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const yemler = useLiveFarmQuery(() => db.yemler.toArray()) || [];
  
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTur, setNewGroupTur] = useState('Karma');
  const [selectedGroupForMilk, setSelectedGroupForMilk] = useState<any>(null);
  const [selectedGroupForAnimals, setSelectedGroupForAnimals] = useState<any>(null);
  
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    
    const id = uuidv4();
    const payload = {
      id,
      ad: newGroupName,
      tur: newGroupTur as any,
      aciklama: '',
      hayvanSayisi: 0
    };
    
    await db.gruplar.add(payload);
    await db.syncQueue.add({
      table: 'gruplar',
      action: 'INSERT',
      payload,
      created_at: Date.now()
    });
    
    setNewGroupName('');
  };
  
  const handleDelete = async (id: string) => {
    if (!window.confirm('Grubu silmek istediğinize emin misiniz? (İçindeki hayvanlar grupsuz kalacaktır)')) return;
    
    await db.gruplar.delete(id);
    await db.syncQueue.add({
      table: 'gruplar',
      action: 'DELETE',
      payload: { id },
      created_at: Date.now()
    });
    
    const affected = hayvanlar.filter(h => h.grupId === id);
    for (const h of affected) {
      const p = { ...h, grupId: null };
      await db.hayvanlar.put(p as any);
      await db.syncQueue.add({
        table: 'hayvanlar',
        action: 'UPDATE',
        payload: p,
        created_at: Date.now()
      });
    }
  };

  const handleUpdateRasyon = async (grupId: string, rasyonAdi: string, rasyonOzet: string) => {
    const grup = gruplar.find(g => g.id === grupId);
    if (!grup) return;

    const payload = { ...grup, rasyonAdi, rasyonOzet, rasyonTarihi: new Date().toISOString() };
    await db.gruplar.put(payload);
    await db.syncQueue.add({
      table: 'gruplar',
      action: 'UPDATE',
      payload,
      created_at: Date.now()
    });
  };

  const RasyonForm: React.FC<{ grup: any }> = ({ grup }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [rAdi, setRAdi] = useState(grup.rasyonAdi || '');
    const [rOzet, setROzet] = useState(grup.rasyonOzet || '');
    
    const [hizliYemId, setHizliYemId] = useState('');
    const [hizliMiktar, setHizliMiktar] = useState('');

    const handleHizliEkle = () => {
      if (!hizliYemId || !hizliMiktar) return;
      const secilenYem = yemler.find(y => y.id === hizliYemId);
      if (!secilenYem) return;
      
      const ekMetin = `${secilenYem.ad}: ${hizliMiktar}kg`;
      if (rOzet.trim() === '') {
        setROzet(ekMetin);
      } else {
        setROzet(rOzet.trim() + ', ' + ekMetin);
      }
      setHizliYemId('');
      setHizliMiktar('');
    };

    const onSave = () => {
      handleUpdateRasyon(grup.id, rAdi, rOzet);
      setIsEditing(false);
    };

    if (!isEditing) {
      return (
        <div className="mt-3 p-3 bg-nature-50 border border-nature-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-nature-700 uppercase mb-1">Atanmış Rasyon</p>
              {grup.rasyonAdi ? (
                <>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-earth-900">{grup.rasyonAdi}</p>
                    {parseRasyonCost(grup.rasyonOzet, yemler) > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        {parseRasyonCost(grup.rasyonOzet, yemler).toLocaleString('tr-TR', {style:'currency', currency:'TRY'})} / Gün
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-earth-600 mt-1">{grup.rasyonOzet}</p>
                  <p className="text-xs text-earth-400 mt-2">Son Güncelleme: {new Date(grup.rasyonTarihi).toLocaleDateString('tr-TR')}</p>
                </>
              ) : (
                <p className="text-sm text-earth-500 italic">Henüz rasyon atanmamış.</p>
              )}
            </div>
            <button onClick={() => setIsEditing(true)} className="text-sm text-nature-600 font-bold hover:underline">Düzenle</button>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 p-3 bg-white border border-earth-300 rounded-lg space-y-3">
        <div>
          <label className="block text-xs font-bold text-earth-700 mb-1">Rasyon Adı</label>
          <input value={rAdi} onChange={e => setRAdi(e.target.value)} placeholder="Örn: Sağmal Erken Dönem" className="w-full p-2 border border-earth-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-earth-700 mb-1">Rasyon İçeriği (Özet)</label>
          <div className="flex space-x-2 mb-2 bg-earth-50 p-2 rounded-lg border border-earth-200 items-center">
             <span className="text-xs font-bold text-earth-600 hidden sm:block">Hızlı Ekle:</span>
             <select value={hizliYemId} onChange={e=>setHizliYemId(e.target.value)} className="flex-1 p-1.5 text-sm border border-earth-300 rounded outline-none">
                <option value="">Yem Seçin...</option>
                {yemler.map(y => <option key={y.id} value={y.id}>{y.ad}</option>)}
             </select>
             <input type="number" step="0.1" placeholder="kg" value={hizliMiktar} onChange={e=>setHizliMiktar(e.target.value)} className="w-20 p-1.5 text-sm border border-earth-300 rounded outline-none" />
             <button onClick={handleHizliEkle} type="button" className="bg-earth-600 text-white px-3 py-1.5 text-sm rounded font-bold hover:bg-earth-700 transition">Ekle</button>
          </div>
          <textarea value={rOzet} onChange={e => setROzet(e.target.value)} placeholder="Örn: 10kg Silaj, 2kg Yonca, 5kg Süt Yemi" className="w-full p-2 border border-earth-300 rounded-lg text-sm resize-none h-16 focus:ring-2 focus:ring-nature-500 outline-none" />
        </div>
        <div className="flex justify-end space-x-2">
          <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm text-earth-600 hover:bg-earth-100 rounded-md">İptal</button>
          <button onClick={onSave} className="px-3 py-1 text-sm bg-nature-600 text-white rounded-md font-bold">Kaydet</button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-earth-200 flex flex-col h-full">
        <div className="p-4 border-b border-earth-200 flex justify-between items-center bg-nature-50 rounded-t-2xl">
          <div className="flex items-center space-x-2">
            <Users className="text-nature-700 w-6 h-6" />
            <h2 className="text-xl font-bold text-earth-900">Grup Yönetimi</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-earth-500 hover:text-red-500 transition">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          <form onSubmit={handleAddGroup} className="bg-earth-50 p-4 rounded-xl border border-earth-200 space-y-4">
            <h3 className="font-bold text-earth-800">Yeni Grup Oluştur</h3>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <input 
                value={newGroupName} 
                onChange={e => setNewGroupName(e.target.value)} 
                placeholder="Grup Adı (Örn: Sağmal 1)" 
                className="flex-1 p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" 
              />
              <select 
                value={newGroupTur} 
                onChange={e => setNewGroupTur(e.target.value)}
                className="p-2 border border-earth-300 rounded-lg outline-none"
              >
                <option value="Karma">Karma</option>
                <option value="İnek">İnek</option>
                <option value="Tosun">Tosun</option>
                <option value="Boğa">Boğa</option>
                <option value="Öküz">Öküz</option>
                <option value="Dana">Dana</option>
                <option value="Düve">Düve</option>
                <option value="Buzağı">Buzağı</option>
              </select>
              <button type="submit" className="bg-nature-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-nature-700 flex justify-center items-center transition">
                <Plus className="w-5 h-5 mr-1" /> Ekle
              </button>
            </div>
          </form>

          <div>
            <h3 className="font-bold text-earth-800 border-b pb-2 mb-4">Mevcut Gruplar</h3>
            {gruplar.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-earth-50 rounded-xl border border-earth-100 border-dashed">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 text-earth-300">
                  <Users className="w-12 h-12" />
                </div>
                <p className="text-lg font-bold text-earth-800 mb-2">Henüz Grup Yok</p>
                <p className="text-earth-500 text-sm max-w-sm">Sürünüzü organize etmek ve toplu işlemler (ör: süt girişi, rasyon atama) yapabilmek için yukarıdaki formu kullanarak ilk grubunuzu oluşturun.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gruplar.map(grup => {
                  const sayi = hayvanlar.filter(h => h.grupId === grup.id).length;
                  return (
                    <div key={grup.id} className="p-3 border border-earth-200 rounded-lg hover:shadow-sm transition bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-earth-900 text-lg">{grup.ad}</div>
                          <div className="text-sm text-earth-600">Tür: {grup.tur} &bull; {sayi} Hayvan</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => setSelectedGroupForAnimals(grup)} className="text-xs font-bold text-earth-700 hover:text-earth-900 bg-earth-100 px-3 py-1 rounded-full border border-earth-200 transition flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1" />
                            Hayvan Ekle/Çıkar
                          </button>
                          {!['Tosun', 'Boğa', 'Öküz', 'Buzağı', 'Dana'].includes(grup.tur) && (
                            <button onClick={() => setSelectedGroupForMilk(grup)} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 transition">
                              Toplu Süt Girişi
                            </button>
                          )}
                          <button onClick={() => handleDelete(grup.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition" title="Grubu Sil">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <RasyonForm grup={grup} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
        </div>
      </div>

      {selectedGroupForMilk && (
        <GroupMilkModal 
          grup={selectedGroupForMilk} 
          onClose={() => setSelectedGroupForMilk(null)} 
        />
      )}

      {selectedGroupForAnimals && (
        <GroupAnimalManagerModal
          grup={selectedGroupForAnimals}
          onClose={() => setSelectedGroupForAnimals(null)}
        />
      )}
    </div>
  );
};

export default GroupManager;
