import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Search, Filter, Activity, Skull, ShoppingCart, AlertTriangle, Plus, LayoutGrid, List } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import AnimalForm from './AnimalForm';

interface AnimalListProps {
  onSelect: (id: string) => void;
}

const AnimalList: React.FC<AnimalListProps> = ({ onSelect }) => {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const {
    aramaMetni,
    setAramaMetni,
    turFiltresi,
    setTurFiltresi,
    durumFiltresi,
    setDurumFiltresi
  } = useStore();

  const gruplar = useLiveQuery(() => db.gruplar.toArray()) || [];
  const saglikOlaylari = useLiveQuery(() => db.saglikOlaylari.toArray()) || [];

  // Arinma kontrolu
  const arinmadakiHayvanIds = new Set(saglikOlaylari.filter(o => {
    if (!o.arinmaSuresiGun || o.arinmaSuresiGun <= 0) return false;
    const bitis = new Date(o.tarih);
    bitis.setDate(bitis.getDate() + o.arinmaSuresiGun);
    bitis.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return bitis >= today;
  }).map(o => o.hayvanId));
  
  const getGrupById = (id: string | null) => {
    return gruplar.find(g => g.id === id);
  };

  const hayvanlar = useLiveQuery(async () => {
    const tumHayvanlar = await db.hayvanlar.toArray();
    return tumHayvanlar.filter((h) => {
      const aramaEslesiyor = h.kupeNo.toLowerCase().includes(aramaMetni.toLowerCase());
      const turEslesiyor = turFiltresi === 'Tümü' || h.tur === turFiltresi;
      const durumEslesiyor = durumFiltresi === 'Tümü' || h.durum === durumFiltresi;
      return aramaEslesiyor && turEslesiyor && durumEslesiyor;
    });
  }, [aramaMetni, turFiltresi, durumFiltresi]) || [];

  const getStatusIcon = (durum: string) => {
    switch(durum) {
      case 'Aktif': return <Activity className="w-4 h-4 text-nature-600" />;
      case 'Öldü': return <Skull className="w-4 h-4 text-red-600" />;
      case 'Satıldı': return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  }

  const getStatusBg = (durum: string) => {
    switch(durum) {
      case 'Aktif': return 'bg-nature-100 text-nature-800 border-nature-200';
      case 'Öldü': return 'bg-red-100 text-red-800 border-red-200';
      case 'Satıldı': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return (
    <div className="space-y-6">
      {/* Başlık ve Ekle Butonu */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-earth-900">Hayvan Listesi</h2>
          <p className="text-earth-500 mt-1">Sürüdeki tüm hayvanları görüntüle ve yönet</p>
        </div>
        <button
          onClick={() => setIsAddFormOpen(true)}
          className="flex items-center space-x-2 bg-nature-600 hover:bg-nature-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Yeni Hayvan Ekle</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-earth-200 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-earth-400" />
          <input
            type="text"
            placeholder="Küpe No ile ara..."
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-earth-50 border border-earth-300 focus:outline-none focus:ring-2 focus:ring-nature-500 focus:border-transparent transition text-lg"
            value={aramaMetni}
            onChange={(e) => setAramaMetni(e.target.value)}
          />
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="flex items-center space-x-2 bg-earth-50 px-3 py-2 rounded-lg border border-earth-300 flex-1 min-w-[140px]">
            <Filter className="w-4 h-4 text-earth-500" />
            <select
              className="bg-transparent border-none focus:outline-none text-earth-700 w-full font-medium"
              value={turFiltresi}
              onChange={(e) => setTurFiltresi(e.target.value)}
            >
              <option value="Tümü">Tüm Türler</option>
              <option value="İnek">İnek</option>
              <option value="Tosun">Tosun</option>
              <option value="Boğa">Boğa</option>
              <option value="Öküz">Öküz</option>
              <option value="Düve">Düve</option>
              <option value="Dana">Dana</option>
              <option value="Buzağı">Buzağı</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-earth-50 px-3 py-2 rounded-lg border border-earth-300 flex-1 min-w-[140px]">
            <Filter className="w-4 h-4 text-earth-500" />
            <select
              className="bg-transparent border-none focus:outline-none text-earth-700 w-full font-medium"
              value={durumFiltresi}
              onChange={(e) => setDurumFiltresi(e.target.value)}
            >
              <option value="Tümü">Tüm Durumlar</option>
              <option value="Aktif">Aktif</option>
              <option value="Satıldı">Satıldı</option>
              <option value="Öldü">Öldü</option>
            </select>
          </div>
          </div>
          
          <div className="flex bg-earth-100 p-1 rounded-lg self-stretch items-center shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-nature-700 font-bold' : 'text-earth-500 hover:text-earth-700'}`}
              title="Izgara Görünümü (İkili)"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow-sm text-nature-700 font-bold' : 'text-earth-500 hover:text-earth-700'}`}
              title="Liste Görünümü (Tekli)"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {hayvanlar.map((hayvan) => {
          const grup = getGrupById(hayvan.grupId);
          return (
            <div
              key={hayvan.id}
              onClick={() => onSelect(hayvan.id)}
              className="bg-white p-4 rounded-xl shadow-sm border border-earth-200 hover:shadow-md hover:border-nature-400 transition cursor-pointer flex justify-between items-center group"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  <h3 className="text-lg font-bold text-earth-900 group-hover:text-nature-700 transition">{hayvan.kupeNo}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border flex items-center space-x-1 ${getStatusBg(hayvan.durum)}`}>
                    {getStatusIcon(hayvan.durum)}
                    <span>{hayvan.durum}</span>
                  </span>
                  {arinmadakiHayvanIds.has(hayvan.id) && (
                    <span className="flex items-center space-x-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-300">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Arınmada</span>
                    </span>
                  )}
                </div>
                <div className="text-earth-600 text-sm font-medium">
                  {hayvan.tur} &bull; {hayvan.irk} &bull; {hayvan.cinsiyet}
                </div>
                <div className="text-earth-500 text-xs">
                  Grup: <span className="font-semibold text-earth-700">{grup?.ad || 'Atanmamış'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-nature-700">{hayvan.guncelAgirlikKg}</div>
                <div className="text-xs text-earth-500 uppercase font-bold tracking-wider">kg</div>
              </div>
            </div>
          );
        })}
        {hayvanlar.length === 0 && (
          <div className="col-span-full py-12 text-center text-earth-500">
            Aradığınız kriterlere uygun hayvan bulunamadı.
          </div>
        )}
      </div>

      {/* Yeni Hayvan Ekle Modal */}
      {isAddFormOpen && (
        <div className="fixed inset-0 bg-earth-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <AnimalForm
              onClose={() => setIsAddFormOpen(false)}
              onSuccess={() => setIsAddFormOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimalList;
