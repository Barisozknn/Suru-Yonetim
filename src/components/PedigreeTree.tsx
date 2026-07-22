import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import type { Hayvan } from '../types';
import { Edit2, X, Save, Trash2 } from 'lucide-react';

interface PedigreeTreeProps {
  hayvan: Hayvan;
  onSelectAnimal: (id: string) => void;
}

const AnimalCard: React.FC<{ hayvan: Hayvan, title: string, onClick: () => void, onEdit?: () => void }> = ({ hayvan, title, onClick, onEdit }) => (
  <div onClick={onClick} className="bg-white dark:bg-gray-800 border border-nature-200 dark:border-nature-800 p-2 md:p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-nature-500 transition text-center md:text-left relative group">
    <div className="flex justify-between items-center mb-1">
      <div className="text-[10px] md:text-xs font-bold text-earth-500 dark:text-gray-400 uppercase">{title}</div>
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-earth-400 hover:text-nature-600 p-1 rounded transition opacity-0 group-hover:opacity-100"
          title="Düzenle"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
    <div className="font-bold text-earth-900 dark:text-gray-100 text-sm md:text-base truncate">{hayvan.kupeNo}</div>
    <div className="text-xs md:text-sm text-earth-600 dark:text-gray-400 truncate">{hayvan.tur} &bull; {hayvan.irk}</div>
  </div>
);

const EmptyCard: React.FC<{ title: string, kupeNo?: string, onClick?: () => void }> = ({ title, kupeNo, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-earth-50 dark:bg-gray-900 border border-dashed border-earth-300 dark:border-gray-600 p-2 md:p-3 rounded-lg flex flex-col justify-center items-center h-full min-h-[60px] md:min-h-[80px] ${onClick ? 'cursor-pointer hover:bg-earth-100 dark:hover:bg-gray-700 hover:border-earth-400 transition' : ''}`}
  >
    <div className="text-[10px] md:text-xs font-bold text-earth-500 dark:text-gray-400 mb-1 uppercase">{title}</div>
    <div className="text-xs md:text-sm text-earth-400 italic text-center truncate w-full" title={kupeNo}>
      {kupeNo ? `${kupeNo} (Yok)` : (onClick ? 'Tıkla ve Ekle' : 'Kayıt Yok')}
    </div>
  </div>
);

const PedigreeTree: React.FC<PedigreeTreeProps> = ({ hayvan, onSelectAnimal }) => {
  const [editingParent, setEditingParent] = useState<'Anne' | 'Baba' | 'Baba-B.Baba' | 'Baba-B.Anne' | 'Anne-B.Baba' | 'Anne-B.Anne' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [manualKupeNo, setManualKupeNo] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const allAnimals = useLiveFarmQuery(() => db.hayvanlar.filter(h => h.durum === 'Aktif').toArray()) || [];

  const anne = useLiveFarmQuery(
    async () => hayvan.anneKupeNo ? await db.hayvanlar.where('kupeNo').equals(hayvan.anneKupeNo).first() : undefined,
    [hayvan.anneKupeNo]
  );

  const baba = useLiveFarmQuery(
    async () => hayvan.babaKupeNo ? await db.hayvanlar.where('kupeNo').equals(hayvan.babaKupeNo).first() : undefined,
    [hayvan.babaKupeNo]
  );

  const anneAnne = useLiveFarmQuery(
    async () => anne?.anneKupeNo ? await db.hayvanlar.where('kupeNo').equals(anne.anneKupeNo).first() : undefined,
    [anne?.anneKupeNo]
  );

  const anneBaba = useLiveFarmQuery(
    async () => anne?.babaKupeNo ? await db.hayvanlar.where('kupeNo').equals(anne.babaKupeNo).first() : undefined,
    [anne?.babaKupeNo]
  );

  const babaAnne = useLiveFarmQuery(
    async () => baba?.anneKupeNo ? await db.hayvanlar.where('kupeNo').equals(baba.anneKupeNo).first() : undefined,
    [baba?.anneKupeNo]
  );

  const babaBaba = useLiveFarmQuery(
    async () => baba?.babaKupeNo ? await db.hayvanlar.where('kupeNo').equals(baba.babaKupeNo).first() : undefined,
    [baba?.babaKupeNo]
  );

  const yavrular = useLiveFarmQuery(async () => {
    return await db.hayvanlar
      .filter(h => (h.anneKupeNo === hayvan.kupeNo) || (h.babaKupeNo === hayvan.kupeNo))
      .toArray();
  }, [hayvan.kupeNo]) || [];

  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParent) return;

    let finalKupeNo = manualKupeNo || undefined;

    let targetAnimal: Hayvan | undefined = undefined;
    const payload: Partial<Hayvan> = {};

    if (editingParent === 'Anne') {
      targetAnimal = hayvan;
      payload.anneKupeNo = finalKupeNo;
    } else if (editingParent === 'Baba') {
      targetAnimal = hayvan;
      payload.babaKupeNo = finalKupeNo;
    } else if (editingParent === 'Baba-B.Baba' && baba) {
      targetAnimal = baba;
      payload.babaKupeNo = finalKupeNo;
    } else if (editingParent === 'Baba-B.Anne' && baba) {
      targetAnimal = baba;
      payload.anneKupeNo = finalKupeNo;
    } else if (editingParent === 'Anne-B.Baba' && anne) {
      targetAnimal = anne;
      payload.babaKupeNo = finalKupeNo;
    } else if (editingParent === 'Anne-B.Anne' && anne) {
      targetAnimal = anne;
      payload.anneKupeNo = finalKupeNo;
    }

    if (targetAnimal) {
      await db.hayvanlar.update(targetAnimal.id, payload);
      const updatedHayvan = await db.hayvanlar.get(targetAnimal.id);
      if (updatedHayvan) {
        await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
        if (navigator.onLine) {
          const { processSyncQueue } = await import('../services/syncService');
          processSyncQueue();
        }
      }
    }

    closeModal();
  };

  const handleClearParent = async () => {
    if (!editingParent) return;

    let targetAnimal: Hayvan | undefined = undefined;
    const payload: Partial<Hayvan> = {};

    if (editingParent === 'Anne') {
      targetAnimal = hayvan;
      payload.anneKupeNo = null as any;
    } else if (editingParent === 'Baba') {
      targetAnimal = hayvan;
      payload.babaKupeNo = null as any;
    } else if (editingParent === 'Baba-B.Baba' && baba) {
      targetAnimal = baba;
      payload.babaKupeNo = null as any;
    } else if (editingParent === 'Baba-B.Anne' && baba) {
      targetAnimal = baba;
      payload.anneKupeNo = null as any;
    } else if (editingParent === 'Anne-B.Baba' && anne) {
      targetAnimal = anne;
      payload.babaKupeNo = null as any;
    } else if (editingParent === 'Anne-B.Anne' && anne) {
      targetAnimal = anne;
      payload.anneKupeNo = null as any;
    }

    if (targetAnimal) {
      await db.hayvanlar.update(targetAnimal.id, payload);
      const updatedHayvan = await db.hayvanlar.get(targetAnimal.id);
      if (updatedHayvan) {
        await db.syncQueue.add({ table: 'hayvanlar', action: 'UPDATE', payload: updatedHayvan, created_at: Date.now() });
        if (navigator.onLine) {
          const { processSyncQueue } = await import('../services/syncService');
          processSyncQueue();
        }
      }
    }

    closeModal();
  };

  const openModal = (type: 'Anne' | 'Baba' | 'Baba-B.Baba' | 'Baba-B.Anne' | 'Anne-B.Baba' | 'Anne-B.Anne') => {
    setEditingParent(type);
    setSearchTerm('');
    let initialKupeNo = '';
    if (type === 'Anne') initialKupeNo = hayvan.anneKupeNo || '';
    if (type === 'Baba') initialKupeNo = hayvan.babaKupeNo || '';
    if (type === 'Baba-B.Baba') initialKupeNo = baba?.babaKupeNo || '';
    if (type === 'Baba-B.Anne') initialKupeNo = baba?.anneKupeNo || '';
    if (type === 'Anne-B.Baba') initialKupeNo = anne?.babaKupeNo || '';
    if (type === 'Anne-B.Anne') initialKupeNo = anne?.anneKupeNo || '';

    setManualKupeNo(initialKupeNo);
    setIsDropdownOpen(false);
  };

  const closeModal = () => {
    setEditingParent(null);
    setSearchTerm('');
    setManualKupeNo('');
  };

  const filteredCandidates = allAnimals.filter(h => {
    if (editingParent === 'Anne' || editingParent === 'Baba-B.Anne' || editingParent === 'Anne-B.Anne') {
      return h.cinsiyet === 'Dişi' && (h.tur === 'İnek' || h.tur === 'Düve');
    }
    if (editingParent === 'Baba' || editingParent === 'Baba-B.Baba' || editingParent === 'Anne-B.Baba') {
      return h.cinsiyet === 'Erkek' && (h.tur === 'Boğa' || h.tur === 'Tosun');
    }
    return false;
  }).filter(h => h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-fade-in p-1 sm:p-2">
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 border-b pb-2">3 Nesil Soy Ağacı</h3>
        <div className="overflow-x-auto pb-2 min-w-0 custom-scrollbar">
          <div className="grid grid-cols-2 gap-2 md:gap-8 relative min-w-[320px]">

          {/* Baba Tarafı */}
          <div className="space-y-4 relative">
            <div className="grid grid-cols-2 gap-1 md:gap-2">
              {babaBaba ? <AnimalCard hayvan={babaBaba} title="B.Baba" onClick={() => onSelectAnimal(babaBaba.id)} onEdit={() => openModal('Baba-B.Baba')} /> : <EmptyCard title="B.Baba" kupeNo={baba?.babaKupeNo} onClick={baba ? () => openModal('Baba-B.Baba') : undefined} />}
              {babaAnne ? <AnimalCard hayvan={babaAnne} title="B.Anne" onClick={() => onSelectAnimal(babaAnne.id)} onEdit={() => openModal('Baba-B.Anne')} /> : <EmptyCard title="B.Anne" kupeNo={baba?.anneKupeNo} onClick={baba ? () => openModal('Baba-B.Anne') : undefined} />}
            </div>
            <div className="flex justify-center relative pt-4">
              <div className="absolute top-0 left-1/4 right-1/4 h-3 border-t-2 border-earth-200 dark:border-gray-700 rounded-t-lg"></div>
              <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-earth-200 -translate-x-1/2"></div>
              <div className="w-full relative z-10">
                {baba ? (
                  <AnimalCard hayvan={baba} title="Baba" onClick={() => onSelectAnimal(baba.id)} onEdit={() => openModal('Baba')} />
                ) : (
                  <EmptyCard title="Baba" kupeNo={hayvan.babaKupeNo} onClick={() => openModal('Baba')} />
                )}
              </div>
            </div>
          </div>

          {/* Anne Tarafı */}
          <div className="space-y-4 relative">
            <div className="grid grid-cols-2 gap-1 md:gap-2">
              {anneBaba ? <AnimalCard hayvan={anneBaba} title="B.Baba" onClick={() => onSelectAnimal(anneBaba.id)} onEdit={() => openModal('Anne-B.Baba')} /> : <EmptyCard title="B.Baba" kupeNo={anne?.babaKupeNo} onClick={anne ? () => openModal('Anne-B.Baba') : undefined} />}
              {anneAnne ? <AnimalCard hayvan={anneAnne} title="B.Anne" onClick={() => onSelectAnimal(anneAnne.id)} onEdit={() => openModal('Anne-B.Anne')} /> : <EmptyCard title="B.Anne" kupeNo={anne?.anneKupeNo} onClick={anne ? () => openModal('Anne-B.Anne') : undefined} />}
            </div>
            <div className="flex justify-center relative pt-4">
              <div className="absolute top-0 left-1/4 right-1/4 h-3 border-t-2 border-earth-200 dark:border-gray-700 rounded-t-lg"></div>
              <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-earth-200 -translate-x-1/2"></div>
              <div className="w-full relative z-10">
                {anne ? (
                  <AnimalCard hayvan={anne} title="Anne" onClick={() => onSelectAnimal(anne.id)} onEdit={() => openModal('Anne')} />
                ) : (
                  <EmptyCard title="Anne" kupeNo={hayvan.anneKupeNo} onClick={() => openModal('Anne')} />
                )}
              </div>
            </div>
          </div>

          <div className="col-span-2 pt-4 flex justify-center relative mt-2">
            <div className="absolute top-0 left-[25%] right-[25%] h-4 border-t-2 border-l-2 border-r-2 border-earth-300 dark:border-gray-600 rounded-t-lg -mt-2"></div>
            <div className="absolute top-2 left-1/2 w-0.5 h-4 bg-earth-300 -translate-x-1/2"></div>

            <div className="bg-nature-50 dark:bg-nature-900/30 border-2 border-nature-500 p-4 rounded-xl shadow w-full max-w-sm text-center relative z-10">
              <div className="text-xs font-black text-nature-700 dark:text-nature-300 mb-1 uppercase">Mevcut Hayvan</div>
              <div className="font-black text-xl text-earth-900 dark:text-gray-100">{hayvan.kupeNo}</div>
              <div className="text-earth-600 dark:text-gray-400 font-medium mt-1">{hayvan.irk}</div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="pt-6">
        <h3 className="text-lg font-bold text-earth-800 dark:text-gray-200 border-b pb-2 mb-4">Yavruları ({yavrular.length})</h3>
        {yavrular.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {yavrular.sort((a, b) => new Date(b.dogumTarihi).getTime() - new Date(a.dogumTarihi).getTime()).map(yavru => (
              <AnimalCard key={yavru.id} hayvan={yavru} title="Yavru" onClick={() => onSelectAnimal(yavru.id)} />
            ))}
          </div>
        ) : (
          <div className="text-earth-500 dark:text-gray-400 italic bg-earth-50 dark:bg-gray-900 p-4 rounded-lg text-center">
            Sistemde kayıtlı yavrusu bulunamadı.
          </div>
        )}
      </div>

      {editingParent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-black text-earth-900 dark:text-gray-100">{editingParent} Ekle / Değiştir</h2>
              <button onClick={closeModal} className="text-earth-500 dark:text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveParent} className="p-5 space-y-5">
              <div className="relative">
                <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Sürüden Seç (Akıllı Arama)</label>
                <input
                  type="text"
                  placeholder="Küpe numarası ara..."
                  className="w-full p-3 bg-earth-50 dark:bg-gray-900 border border-earth-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-nature-500"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                {isDropdownOpen && searchTerm.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-earth-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredCandidates.length > 0 ? (
                        filteredCandidates.map(c => (
                          <div
                            key={c.id}
                            className="p-3 hover:bg-earth-50 dark:hover:bg-gray-700 cursor-pointer border-b border-earth-100 dark:border-gray-700 last:border-0"
                            onClick={() => {
                              setManualKupeNo(c.kupeNo);
                              setSearchTerm('');
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="font-bold">{c.kupeNo}</span> <span className="text-sm text-earth-500 dark:text-gray-400">({c.tur})</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-earth-500 dark:text-gray-400 text-sm text-center">Eşleşen kayıt bulunamadı.</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Seçilen / Elle Yazılan Küpe No</label>
                <input
                  type="text"
                  placeholder="TR..."
                  className="w-full p-3 bg-earth-50 dark:bg-gray-900 border border-earth-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-nature-500 font-bold text-lg"
                  value={manualKupeNo}
                  onChange={(e) => setManualKupeNo(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-between items-center">
                <button type="button" onClick={handleClearParent} className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 transition flex items-center space-x-2">
                  <Trash2 className="w-5 h-5" />
                  <span className="hidden sm:inline">Kaydı Sil</span>
                </button>
                <button type="submit" className="px-6 py-2.5 bg-nature-600 text-white font-bold rounded-xl hover:bg-nature-700 transition flex items-center space-x-2">
                  <Save className="w-5 h-5" />
                  <span>Kaydet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedigreeTree;
