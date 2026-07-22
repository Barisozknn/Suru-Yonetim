import React, { useState } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { calculateGrowthStatus, calculateAgeInDays } from '../utils/calfCalculations';
import { X, Droplet, Droplets, AlertCircle, Activity, ClipboardEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CalfFormModal from './CalfFormModal';

interface Props {
  onClose?: () => void;
  onSelectCalf?: (id: string) => void;
}

const CalfList: React.FC<Props> = ({ onClose, onSelectCalf }) => {
  const navigate = useNavigate();
  const [selectedCalfForTracking, setSelectedCalfForTracking] = useState<string | null>(null);
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const buzagiKayitlari = useLiveFarmQuery(() => db.buzagiKayitlari.toArray()) || [];

  // Sadece Buzağıları veya 6 aydan (180 gün) küçük olanları filtrele
  const buzagilar = hayvanlar
    .filter(h => h.tur === 'Buzağı' || calculateAgeInDays(h.dogumTarihi) <= 180)
    .map(h => {
      const kayit = buzagiKayitlari.find(k => k.hayvanId === h.id);
      return { ...h, ageDays: calculateAgeInDays(h.dogumTarihi), kayit };
    })
    .sort((a, b) => a.ageDays - b.ageDays);

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 flex flex-col h-full">
        
        <div className="p-4 border-b border-earth-200 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-2 text-blue-800">
            <Droplets className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-black">Buzağı Listesi</h2>
              <p className="text-xs text-blue-600/70 opacity-80">Gelişim takibi ve hedefler</p>
            </div>
          </div>
            {onClose && (
              <button onClick={onClose} className="text-earth-500 dark:text-gray-400 hover:text-red-500 transition">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

        <div className="flex-1 overflow-y-auto p-4 bg-earth-50 dark:bg-gray-900">
          {buzagilar.length === 0 ? (
            <div className="text-center py-12 text-earth-400">
              <Droplets className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Sürüde şu an kayıtlı buzağı bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buzagilar.map(buzagi => {
                const { status, color, percentage } = calculateGrowthStatus(
                  buzagi.guncelAgirlikKg,
                  buzagi.kayit?.hedefSuttenKesimAgirligiKg
                );

                const agizSutuAlert = !buzagi.kayit?.agizSutuVerildi;

                return (
                  <div
                    key={buzagi.id}
                    onClick={() => {
                      if (onSelectCalf) {
                        if (onClose) onClose();
                        onSelectCalf(buzagi.id);
                      } else {
                        navigate(`/hayvanlar?id=${buzagi.id}`);
                      }
                    }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-earth-200 dark:border-gray-700 shadow-sm transition cursor-pointer hover:shadow-md hover:border-blue-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-earth-900 dark:text-gray-100 text-lg">{buzagi.kupeNo}</h3>
                          <span className="text-xs px-2 py-0.5 bg-earth-100 dark:bg-gray-800 text-earth-600 dark:text-gray-400 font-bold rounded-md">
                            {buzagi.ageDays} Günlük
                          </span>
                        </div>
                        <p className="text-xs text-earth-500 dark:text-gray-400">{buzagi.irk} • {buzagi.cinsiyet}</p>
                      </div>
                      
                      {agizSutuAlert && (
                        <div className="text-red-500 flex items-center space-x-1" title="Ağız Sütü Bilgisi Eksik!">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-earth-50 dark:bg-gray-900 p-2 rounded-lg border border-earth-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase">Mevcut KG</span>
                        <span className="font-bold text-earth-900 dark:text-gray-100">{buzagi.guncelAgirlikKg || '-'}</span>
                      </div>
                      <div className="bg-earth-50 dark:bg-gray-900 p-2 rounded-lg border border-earth-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-bold text-earth-500 dark:text-gray-400 uppercase">Hedef KG</span>
                        <span className="font-bold text-earth-900 dark:text-gray-100">{buzagi.kayit?.hedefSuttenKesimAgirligiKg || '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-earth-100 dark:border-gray-700">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-earth-600 dark:text-gray-400">
                        <Droplet className={`w-4 h-4 ${buzagi.kayit?.agizSutuVerildi ? 'text-blue-500' : 'text-earth-300'}`} />
                        <span>{buzagi.kayit?.agizSutuVerildi ? 'Ağız Sütü Aldı' : 'Eksik'}</span>
                      </div>

                      {buzagi.kayit?.hedefSuttenKesimAgirligiKg ? (
                        <div className={`px-2 py-1 rounded-lg border text-xs font-bold flex items-center space-x-1 ${color}`}>
                          <Activity className="w-3 h-3" />
                          <span>% {Math.round(percentage)} ({status})</span>
                        </div>
                      ) : (
                        <div className="text-xs text-earth-400 italic">Hedef girilmemiş</div>
                      )}

                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedCalfForTracking(buzagi.id); }}
                        className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200"
                        title="Büyütme Takibi Düzenle"
                      >
                        <ClipboardEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {selectedCalfForTracking && (
        <CalfFormModal 
          hayvanId={selectedCalfForTracking} 
          onClose={() => setSelectedCalfForTracking(null)} 
        />
      )}
    </div>
  );
};

export default CalfList;
