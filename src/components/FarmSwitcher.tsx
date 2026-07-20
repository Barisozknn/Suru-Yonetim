import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';

export default function FarmSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const { activeCiftlikId, setActiveCiftlikId, ciftlikler, setCiftlikler, user } = useStore();

  const handleAddFarm = async () => {
    const name = prompt('Yeni çiftlik adını girin:');
    if (!name || !name.trim()) return;

    try {
      const newFarm = {
        id: crypto.randomUUID(),
        ad: name.trim(),
        user_id: user?.id,
        olusturulmaTarihi: new Date().toISOString()
      };

      // Local'e kaydet
      await db.ciftlikler.add(newFarm);
      
      // Zustand'i guncelle
      const updatedList = [...ciftlikler, newFarm];
      setCiftlikler(updatedList);
      
      // Aktif yap
      setActiveCiftlikId(newFarm.id);
      
      // Buluta senkronize et
      if (user) {
        await supabase.from('ciftlikler').insert({
          id: newFarm.id,
          ad: newFarm.ad,
          user_id: user.id
        });
      }
    } catch (err) {
      console.error('Çiftlik eklenirken hata:', err);
      alert('Çiftlik eklenirken bir hata oluştu!');
    }
  };

  const handleEditFarm = async (id: string, currentName: string) => {
    setIsEditing(id);
    setEditName(currentName);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      setIsEditing(null);
      return;
    }

    try {
      // Local guncelle
      await db.ciftlikler.update(id, { ad: editName.trim() });
      
      // Zustand'i guncelle
      const updatedList = ciftlikler.map(c => c.id === id ? { ...c, ad: editName.trim() } : c);
      setCiftlikler(updatedList);
      
      // Buluta senkronize et
      if (user) {
        await supabase.from('ciftlikler').update({ ad: editName.trim() }).eq('id', id);
      }
    } catch (err) {
      console.error('Çiftlik güncellenirken hata:', err);
    }
    setIsEditing(null);
  };

  const handleDeleteFarm = async (id: string, name: string) => {
    if (ciftlikler.length <= 1) {
      alert('Son kalan çiftliği silemezsiniz!');
      return;
    }
    
    if (!window.confirm(`"${name}" çiftliğini ve içindeki TÜM VERİLERİ silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) {
      return;
    }

    try {
      // Localden sil (cascade effect gerektirmez çünkü useLiveFarmQuery filtreliyor, 
      // ama temizlik için verileri de silebiliriz. Şimdilik sadece ciftligi silelim)
      await db.ciftlikler.delete(id);
      
      // Zustand'i guncelle
      const updatedList = ciftlikler.filter(c => c.id !== id);
      setCiftlikler(updatedList);
      
      // Eger silinen aktif ciftlikse, ilk siradakine gec
      if (activeCiftlikId === id) {
        setActiveCiftlikId(updatedList[0].id);
      }
      
      // Buluttan sil
      if (user) {
        await supabase.from('ciftlikler').delete().eq('id', id);
      }
    } catch (err) {
      console.error('Çiftlik silinirken hata:', err);
    }
  };

  const activeFarmName = ciftlikler.find(c => c.id === activeCiftlikId)?.ad || 'Varsayılan Çiftlik';

  // Modal dışına tıklayınca kapatma (basit implementasyon)
  React.useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      if (isOpen && !(e.target as Element).closest('.farm-switcher-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [isOpen]);

  return (
    <div className="relative farm-switcher-container">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
      >
        <Building2 className="w-4 h-4" />
        <span className="font-medium">{activeFarmName}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Çiftlikleriniz</h3>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {ciftlikler.map(ciftlik => (
              <div 
                key={ciftlik.id}
                className={`flex items-center justify-between p-3 border-b border-gray-50 hover:bg-indigo-50 transition-colors ${activeCiftlikId === ciftlik.id ? 'bg-indigo-50/50' : ''}`}
              >
                {isEditing === ciftlik.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && saveEdit(ciftlik.id)}
                    />
                    <button onClick={() => saveEdit(ciftlik.id)} className="text-green-600 hover:text-green-700">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      className="flex-1 flex items-center gap-2 text-left"
                      onClick={() => {
                        setActiveCiftlikId(ciftlik.id);
                        setIsOpen(false);
                      }}
                    >
                      {activeCiftlikId === ciftlik.id && <Check className="w-4 h-4 text-indigo-600" />}
                      <span className={`text-sm ${activeCiftlikId === ciftlik.id ? 'font-semibold text-indigo-700' : 'text-gray-700'}`}>
                        {ciftlik.ad}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditFarm(ciftlik.id, ciftlik.ad)} className="p-1 text-gray-400 hover:text-indigo-600" title="Düzenle">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteFarm(ciftlik.id, ciftlik.ad)} disabled={ciftlikler.length <= 1} className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-gray-400" title="Sil">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {ciftlikler.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                Kayıtlı çiftliğiniz bulunmuyor.
              </div>
            )}
          </div>
          
          <div className="p-2 bg-gray-50">
            <button 
              onClick={handleAddFarm}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Çiftlik Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
