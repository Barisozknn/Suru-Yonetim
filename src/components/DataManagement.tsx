import React, { useState, useRef } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { FileUp, Search, Calendar, FileSpreadsheet, FileText, AlertCircle, X } from 'lucide-react';
import { exportData, downloadTemplate } from '../services/dataExportService';
import { importData } from '../services/dataImportService';

const KATEGORILER = [
  { id: 'hayvanlar', label: 'Hayvan Listesi', importable: true },
  { id: 'gruplar', label: 'Grup Yönetimi', importable: true },
  { id: 'yemler', label: 'Yem Deposu', importable: true },
  { id: 'buzagilar', label: 'Buzağı Listesi', importable: true },
  { id: 'soyAgaci', label: 'Soy Ağacı', importable: false, requireAnimal: true },
  { id: 'verimGecmisi', label: 'Verim Geçmişi (Süt/Ağırlık)', importable: false, requireAnimal: true },
  { id: 'gelirGider', label: 'Gelir Gider Analizi', importable: false, requireDates: true },
];

const DataManagement: React.FC = () => {
  const [selectedKategori, setSelectedKategori] = useState<string>('hayvanlar');
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];

  const activeKategori = KATEGORILER.find(k => k.id === selectedKategori);

  const filteredHayvanlar = hayvanlar.filter(h => 
    h.kupeNo.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedAnimalIds.includes(h.id)
  );

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setIsLoading(true);
      await exportData(format, selectedKategori, selectedAnimalIds, startDate, endDate);
    } catch (err: any) {
      alert(err.message || 'Dışa aktarma sırasında hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      await importData(file, selectedKategori);
    } catch (err: any) {
      alert(err.message || 'İçe aktarma sırasında hata oluştu.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6">
      <div className="flex items-center justify-between border-b border-earth-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-earth-900">Veri Yönetimi (Gelişmiş)</h2>
            <p className="text-xs text-earth-500">Excel ve PDF formatında raporlar ve veri transferi</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Kategori Seçimi */}
        <div className="space-y-1">
          <label className="text-sm font-bold text-earth-700">İşlem Yapılacak Veri (Kategori)</label>
          <select 
            value={selectedKategori}
            onChange={(e) => {
              setSelectedKategori(e.target.value);
              setSelectedAnimalIds([]);
              setSearchTerm('');
            }}
            className="w-full p-3 border-2 border-earth-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            {KATEGORILER.map(k => (
              <option key={k.id} value={k.id}>{k.label}</option>
            ))}
          </select>
        </div>

        {/* Dinamik Filtreler */}
        {activeKategori?.requireAnimal && (
          <div className="space-y-1 p-4 bg-earth-50 rounded-xl border border-earth-200">
            <label className="text-sm font-bold text-earth-700 flex items-center space-x-2">
              <Search className="w-4 h-4 text-earth-500" />
              <span>Hayvan Seçin</span>
            </label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Küpe numarası ara..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-earth-300 rounded-lg outline-none focus:border-blue-500"
              />
              {searchTerm && (
                <div className="absolute w-full mt-1 bg-white border border-earth-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {filteredHayvanlar.map(h => (
                    <div 
                      key={h.id} 
                      className="p-2 hover:bg-blue-50 cursor-pointer text-sm font-medium border-b border-earth-100 last:border-0"
                      onClick={() => {
                        setSelectedAnimalIds(prev => [...prev, h.id]);
                        setSearchTerm('');
                      }}
                    >
                      {h.kupeNo} ({h.tur})
                    </div>
                  ))}
                  {filteredHayvanlar.length === 0 && (
                    <div className="p-2 text-sm text-earth-500 text-center">Sonuç bulunamadı</div>
                  )}
                </div>
              )}
            </div>
            
            {/* Seçili Hayvanlar (Pills) */}
            {selectedAnimalIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedAnimalIds.map(id => {
                  const h = hayvanlar.find(x => x.id === id);
                  if (!h) return null;
                  return (
                    <div key={id} className="flex items-center bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1.5 rounded-full border border-blue-200">
                      <span>{h.kupeNo}</span>
                      <button 
                        onClick={() => setSelectedAnimalIds(prev => prev.filter(p => p !== id))}
                        className="ml-1.5 text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {selectedAnimalIds.length > 0 && (
              <p className="text-xs text-green-600 font-bold mt-2 flex items-center">
                ✓ Toplam {selectedAnimalIds.length} hayvan seçildi.
                <button onClick={() => {setSelectedAnimalIds([]); setSearchTerm('');}} className="ml-2 text-red-500 underline">Tümünü Temizle</button>
              </p>
            )}
          </div>
        )}

        {activeKategori?.requireDates && (
          <div className="space-y-2 p-4 bg-earth-50 rounded-xl border border-earth-200">
            <label className="text-sm font-bold text-earth-700 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-earth-500" />
              <span>Tarih Aralığı (Opsiyonel)</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-earth-500 mb-1 block">Başlangıç</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-earth-300 rounded-lg" />
              </div>
              <div>
                <span className="text-xs text-earth-500 mb-1 block">Bitiş</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-earth-300 rounded-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Aksiyon Butonları */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-earth-100">
          
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-earth-600 mb-2 uppercase">Dışa Aktar (Rapor)</h3>
            <button 
              onClick={() => handleExport('excel')}
              disabled={isLoading || (activeKategori?.requireAnimal && selectedAnimalIds.length === 0)}
              className="flex items-center justify-center space-x-2 w-full py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold hover:bg-green-100 transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Excel Olarak İndir (.xlsx)</span>
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              disabled={isLoading || (activeKategori?.requireAnimal && selectedAnimalIds.length === 0)}
              className="flex items-center justify-center space-x-2 w-full py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition disabled:opacity-50"
            >
              <FileText className="w-5 h-5" />
              <span>PDF Olarak İndir (.pdf)</span>
            </button>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-earth-100 pt-4 md:pt-0 md:pl-4">
            <h3 className="text-sm font-bold text-earth-600 mb-2 uppercase">İçe Aktar (Excel Yükle)</h3>
            {activeKategori?.importable ? (
              <>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                >
                  <FileUp className="w-5 h-5" />
                  <span>{isLoading ? 'Yükleniyor...' : 'Excel Dosyası Seç'}</span>
                </button>
                <button 
                  onClick={() => downloadTemplate(selectedKategori)}
                  className="mt-2 flex items-center justify-center space-x-2 w-full py-2 bg-transparent text-blue-600 border border-blue-200 rounded-xl font-bold hover:bg-blue-50 transition text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Örnek Şablon İndir (.xlsx)</span>
                </button>
                <p className="text-xs text-earth-400 mt-2 flex items-start">
                  <AlertCircle className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span>Sadece eksik/yeni kayıtlar içeri alınır. Zaten var olan {activeKategori.label.toLowerCase()} atlanır.</span>
                </p>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-4 bg-earth-50 rounded-xl border border-earth-100 text-earth-400 text-sm font-medium text-center">
                Bu kategori için içe aktarım desteklenmiyor.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DataManagement;
