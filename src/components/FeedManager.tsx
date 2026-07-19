import React, { useState } from 'react';
import { X, Plus, AlertCircle, ArrowDownUp, Trash2, Edit2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Yem } from '../types';
import FeedMovementModal from './FeedMovementModal';
import { v4 as uuidv4 } from 'uuid';

const FeedManager: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const yemler = useLiveQuery(() => db.yemler.toArray()) || [];
  const [selectedYem, setSelectedYem] = useState<Yem | null>(null);
  
  // New Feed Form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [ad, setAd] = useState('');
  const [tur, setTur] = useState('Kaba Yem');
  const [birimFiyat, setBirimFiyat] = useState(0);
  const [minStokUyariKg, setMinStokUyariKg] = useState(500);
  const [kmYuzde, setKmYuzde] = useState(88);
  const [meMcalKg, setMeMcalKg] = useState(2.2);
  const [hpYuzde, setHpYuzde] = useState(12);
  const [caYuzde, setCaYuzde] = useState(0.5);
  const [pYuzde, setPYuzde] = useState(0.3);

  const handleAddNewFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ad) return;

    if (editingFeedId) {
      const payload: Partial<Yem> = {
        ad, tur, birimFiyat, minStokUyariKg, kmYuzde, meMcalKg, hpYuzde, caYuzde, pYuzde
      };
      await db.yemler.update(editingFeedId, payload);
      await db.syncQueue.add({
        table: 'yemler',
        action: 'UPDATE',
        payload: { id: editingFeedId, ...payload },
        created_at: Date.now()
      });
    } else {
      const payload: Yem = {
        id: uuidv4(),
        ad, tur, stokKg: 0, birimFiyat, minStokUyariKg, kmYuzde, meMcalKg, hpYuzde, caYuzde, pYuzde
      };
      await db.yemler.add(payload);
      await db.syncQueue.add({
        table: 'yemler',
        action: 'INSERT',
        payload,
        created_at: Date.now()
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setIsAddingNew(false);
    setEditingFeedId(null);
    setAd('');
    setBirimFiyat(0);
    setMinStokUyariKg(500);
    setKmYuzde(88);
    setMeMcalKg(2.2);
    setHpYuzde(12);
    setCaYuzde(0.5);
    setPYuzde(0.3);
  };

  const handleEditClick = (yem: Yem) => {
    setEditingFeedId(yem.id);
    setAd(yem.ad);
    setTur(yem.tur);
    setBirimFiyat(yem.birimFiyat || 0);
    setMinStokUyariKg(yem.minStokUyariKg || 0);
    setKmYuzde(yem.kmYuzde ?? 88);
    setMeMcalKg(yem.meMcalKg ?? 2.2);
    setHpYuzde(yem.hpYuzde ?? 12);
    setCaYuzde(yem.caYuzde ?? 0.5);
    setPYuzde(yem.pYuzde ?? 0.3);
    setIsAddingNew(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Bu yemi silmek istediğinize emin misiniz?')) {
      await db.yemler.delete(id);
      await db.syncQueue.add({
        table: 'yemler',
        action: 'DELETE',
        payload: { id },
        created_at: Date.now()
      });
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-earth-200 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-earth-200 flex justify-between items-center bg-nature-50">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-earth-900">Yem Deposu ve Stok Yönetimi</h2>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-earth-500 hover:text-red-500 transition">
              <X className="w-7 h-7" />
            </button>
          )}
        </div>
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-earth-50/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-earth-800 text-lg">Mevcut Yemler</h3>
            <button 
              onClick={() => {
                if (isAddingNew) {
                  resetForm();
                } else {
                  setIsAddingNew(true);
                }
              }} 
              className="flex items-center space-x-1 px-4 py-2 bg-nature-600 text-white rounded-lg font-bold hover:bg-nature-700 transition"
            >
              {isAddingNew && !editingFeedId ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span>{isAddingNew && !editingFeedId ? 'İptal' : 'Yeni Yem Ekle'}</span>
            </button>
          </div>

          {isAddingNew && (
            <form onSubmit={handleAddNewFeed} className="mb-6 bg-white p-5 rounded-xl border border-earth-200 shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h4 className="font-bold text-earth-800">
                  {editingFeedId ? 'Yemi Düzenle' : 'Yeni Yem Kaydı'}
                </h4>
                {editingFeedId && (
                  <button type="button" onClick={resetForm} className="text-earth-400 hover:text-earth-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Yem Adı</label>
                  <input required value={ad} onChange={e => setAd(e.target.value)} placeholder="Örn: Yonca Balyası" className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Tür</label>
                  <select value={tur} onChange={e => setTur(e.target.value)} className="w-full p-2 border border-earth-300 rounded-lg outline-none focus:ring-2 focus:ring-nature-500">
                    <option>Kaba Yem</option>
                    <option>Kesif Yem</option>
                    <option>Mineral/Vitamin</option>
                    <option>Sıvı Takviye</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Birim Fiyat (TL/Kg)</label>
                  <input type="number" step="0.01" min="0" value={birimFiyat} onChange={e => setBirimFiyat(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Min Uyarı (Kg)</label>
                  <input type="number" step="1" min="0" value={minStokUyariKg} onChange={e => setMinStokUyariKg(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Kuru Madde (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={kmYuzde} onChange={e => setKmYuzde(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Enerji (ME Mcal/kg)</label>
                  <input type="number" step="0.01" min="0" value={meMcalKg} onChange={e => setMeMcalKg(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Ham Protein (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={hpYuzde} onChange={e => setHpYuzde(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Kalsiyum (Ca %)</label>
                  <input type="number" step="0.01" min="0" value={caYuzde} onChange={e => setCaYuzde(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-earth-600 mb-1">Fosfor (P %)</label>
                  <input type="number" step="0.01" min="0" value={pYuzde} onChange={e => setPYuzde(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg focus:ring-2 focus:ring-nature-500 outline-none" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" className="px-6 py-2 bg-nature-600 text-white rounded-lg font-bold hover:bg-nature-700 transition">
                  Kaydet
                </button>
              </div>
            </form>
          )}

          {yemler.length === 0 ? (
            <div className="text-center py-10 text-earth-500 italic bg-white rounded-xl border border-earth-200">
              Henüz depoya yem eklenmemiş.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {yemler.map(yem => {
                const isLowStock = yem.stokKg <= yem.minStokUyariKg;
                return (
                  <div key={yem.id} className={`p-5 rounded-xl border ${isLowStock ? 'bg-red-50 border-red-200' : 'bg-white border-earth-200 hover:border-nature-400'} shadow-sm transition flex flex-col justify-between`}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-bold text-earth-900">{yem.ad}</h4>
                          <span className="text-sm font-medium text-earth-500">{yem.tur}</span>
                        </div>
                        {isLowStock && (
                          <span className="flex items-center text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full mr-2">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Kritik Stok
                          </span>
                        )}
                        <div className="flex space-x-1">
                          <button onClick={() => handleEditClick(yem)} className="p-1.5 bg-earth-100 text-earth-600 rounded hover:bg-earth-200" title="Düzenle">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteClick(yem.id)} className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100" title="Sil">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-6">
                        <div>
                          <p className="text-xs font-bold text-earth-500 uppercase">Mevcut Stok</p>
                          <p className={`text-2xl font-black ${isLowStock ? 'text-red-600' : 'text-nature-700'}`}>
                            {yem.stokKg.toLocaleString('tr-TR')} <span className="text-base font-bold">kg</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-earth-500 uppercase">Birim Fiyat</p>
                          <p className="text-xl font-bold text-earth-800">
                            {yem.birimFiyat.toLocaleString('tr-TR', {style:'currency', currency:'TRY'})}
                          </p>
                        </div>
                      </div>
                    </div>
                      
                      {yem.kmYuzde !== undefined && (
                        <div className="mt-4 pt-3 border-t border-earth-100 flex flex-wrap gap-2">
                          <div className="bg-earth-100 text-earth-700 px-2 py-1 rounded-md text-xs font-bold">KM: %{yem.kmYuzde}</div>
                          <div className="bg-earth-100 text-earth-700 px-2 py-1 rounded-md text-xs font-bold">ME: {yem.meMcalKg}</div>
                          <div className="bg-earth-100 text-earth-700 px-2 py-1 rounded-md text-xs font-bold">HP: %{yem.hpYuzde}</div>
                          <div className="bg-earth-100 text-earth-700 px-2 py-1 rounded-md text-xs font-bold">Ca: %{yem.caYuzde}</div>
                          <div className="bg-earth-100 text-earth-700 px-2 py-1 rounded-md text-xs font-bold">P: %{yem.pYuzde}</div>
                        </div>
                      )}
                    <div className="mt-6 pt-4 border-t border-earth-200 flex justify-end">
                      <button 
                        onClick={() => setSelectedYem(yem)}
                        className="flex items-center space-x-1 px-4 py-2 bg-earth-100 text-earth-800 rounded-lg font-bold hover:bg-earth-200 transition"
                      >
                        <ArrowDownUp className="w-4 h-4" />
                        <span>Giriş / Çıkış Yap</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {selectedYem && (
        <FeedMovementModal 
          yem={selectedYem} 
          onClose={() => setSelectedYem(null)} 
        />
      )}
    </div>
  );
};

export default FeedManager;
