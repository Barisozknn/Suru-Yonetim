import React, { useState } from 'react';
import { useLiveFarmQuery } from '../../hooks/useLiveFarmQuery';
import { db } from '../../lib/db';
import { useStore } from '../../store/useStore';
import { calculateInbreedingCoeff } from '../../utils/geneticScoring';
import { Heart, AlertTriangle, Info, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const MatingPlanner: React.FC = () => {
  const [selectedDisiId, setSelectedDisiId] = useState<string>('');
  const [selectedErkekId, setSelectedErkekId] = useState<string>('');
  const [isSperma, setIsSperma] = useState<boolean>(false); // Erkek sürüden mi spermden mi?
  
  const activeCiftlikId = useStore(state => state.activeCiftlikId);
  const isGuest = useStore(state => state.isGuest);

  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];
  const uremeKayitlari = useLiveFarmQuery(() => db.uremeKayitlari.toArray()) || [];
  
  // Damızlık: SADECE İnek ve Boğa
  const disiler = hayvanlar.filter(h => h.durum === 'Aktif' && h.tur === 'İnek');
  const erkekler = hayvanlar.filter(h => h.durum === 'Aktif' && h.tur === 'Boğa');

  // Üreme kayıtlarından benzersiz sperma bilgileri
  const spermaListesi = uremeKayitlari
    .filter(k => k.tur === 'Tohumlama/Aşım' && k.detaylar?.spermaBogaBilgisi)
    .map(k => k.detaylar!.spermaBogaBilgisi as string)
    .filter((v, i, a) => a.indexOf(v) === i);

  const selectedDisi = disiler.find(d => d.id === selectedDisiId);
  const selectedErkek = isSperma
    ? { id: selectedErkekId, bogaAdi: selectedErkekId, irk: 'Suni Tohumlama' } // sanal obje
    : erkekler.find(e => e.id === selectedErkekId);

  // Akrabalık (Inbreeding) F Katsayısı
  const fCoeff = React.useMemo(() => {
    if (!selectedDisi) return 0;
    // Eğer suni tohumlama ise ve sperma tablosunda pedigri verisi yoksa 0 sayılır. (Geliştirilebilir)
    if (isSperma) return 0; 
    if (!selectedErkekId) return 0;

    return calculateInbreedingCoeff(selectedErkekId, selectedDisiId, hayvanlar);
  }, [selectedDisiId, selectedErkekId, isSperma, hayvanlar]);

  const handleSavePlan = async () => {
    if (!selectedDisiId || !selectedErkekId) return;
    if (isGuest) {
      alert('Bu özellik yalnızca kayıtlı kullanıcılara kaydedilir. Lütfen giriş yapın.');
      return;
    }
    const user = useStore.getState().user;
    if (!user) return;
    try {
      const plan = {
        ciftlik_id: activeCiftlikId,
        user_id: user.id,
        disi_hayvan_id: selectedDisiId,
        erkek_hayvan_id: isSperma ? null : selectedErkekId,
        sperma_bilgisi: isSperma ? selectedErkekId : null,
        planlanan_tarih: new Date().toISOString(),
        akrabalik_katsayisi: fCoeff,
        durum: 'Planlandı',
        notlar: `Akrabalık (Inbreeding) Oranı: %${(fCoeff * 100).toFixed(2)}`
      };
      await supabase.from('planlanan_ciftlesmeler').insert([plan]);
      alert('Çiftleştirme planı başarıyla kaydedildi.');
      setSelectedDisiId('');
      setSelectedErkekId('');
    } catch (error) {
      console.error(error);
      alert('Plan kaydedilirken bir hata oluştu.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-nature-50 dark:bg-nature-900/30 p-4 rounded-xl border border-nature-200 dark:border-nature-800 text-sm text-nature-800 dark:text-nature-200 flex items-start gap-3">
        <Heart className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p><strong>Çiftleştirme Planlama:</strong> Sürünüzdeki dişiler ile en uygun boğaları eşleştirerek genetik ilerlemeyi hedefleyin. Akrabalı yetiştirmeden (Inbreeding) kaçınmak için uyarıları dikkate alın.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dişi Seçimi */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-earth-700 dark:text-gray-300">Dişi Hayvan Seç</label>
          <select 
            value={selectedDisiId}
            onChange={(e) => setSelectedDisiId(e.target.value)}
            className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-700 text-earth-900 dark:text-white"
          >
            <option value="">-- Dişi Seçiniz --</option>
            {disiler.map(d => (
              <option key={d.id} value={d.id}>{d.kupeNo} - {d.irk}</option>
            ))}
          </select>
        </div>

        {/* Erkek Seçimi */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-earth-700 dark:text-gray-300">Baba / Boğa / Sperma Seç</label>
            <div className="flex space-x-2 text-xs">
              <button 
                onClick={() => { setIsSperma(false); setSelectedErkekId(''); }}
                className={`px-2 py-1 rounded-md font-bold ${!isSperma ? 'bg-nature-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              >
                Sürü İçi Boğa
              </button>
              <button 
                onClick={() => { setIsSperma(true); setSelectedErkekId(''); }}
                className={`px-2 py-1 rounded-md font-bold ${isSperma ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              >
                Suni Tohumlama
              </button>
            </div>
          </div>
          <select 
            value={selectedErkekId}
            onChange={(e) => setSelectedErkekId(e.target.value)}
            className="w-full p-3 border-2 border-earth-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-nature-500 bg-white dark:bg-gray-700 text-earth-900 dark:text-white"
          >
            <option value="">-- {isSperma ? 'Sperma' : 'Boğa'} Seçiniz --</option>
            {!isSperma 
              ? erkekler.map(e => <option key={e.id} value={e.id}>{e.kupeNo} - {e.irk}</option>)
              : spermaListesi.map((s, i) => <option key={i} value={s}>{s}</option>)
            }
          </select>
        </div>
      </div>

      {selectedDisi && selectedErkek && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-earth-200 dark:border-gray-700 shadow-sm space-y-6">
          <h3 className="text-xl font-black text-earth-900 dark:text-white text-center">Eşleşme Analizi</h3>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-center">
            <div className="bg-earth-50 dark:bg-gray-700 p-4 rounded-xl w-full sm:w-1/3">
              <p className="text-sm text-earth-500 dark:text-gray-400">Anne</p>
              <p className="font-bold text-lg text-earth-900 dark:text-white">{selectedDisi.kupeNo}</p>
              <p className="text-xs text-earth-600 dark:text-gray-300">{selectedDisi.irk}</p>
            </div>
            <div className="text-pink-500"><Heart className="w-8 h-8" fill="currentColor" /></div>
            <div className="bg-earth-50 dark:bg-gray-700 p-4 rounded-xl w-full sm:w-1/3">
              <p className="text-sm text-earth-500 dark:text-gray-400">Baba</p>
              <p className="font-bold text-lg text-earth-900 dark:text-white">
                {isSperma ? selectedErkekId : (selectedErkek as any)?.kupeNo}
              </p>
              <p className="text-xs text-earth-600 dark:text-gray-300">{selectedErkek.irk}</p>
            </div>
          </div>

          <div className={`p-4 rounded-xl flex items-start gap-3 border ${fCoeff > 0.0625 ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200'}`}>
            {fCoeff > 0.0625 ? <AlertTriangle className="w-6 h-6 flex-shrink-0" /> : <Info className="w-6 h-6 flex-shrink-0" />}
            <div>
              <p className="font-bold">Akrabalık (Inbreeding) Oranı: %{(fCoeff * 100).toFixed(2)}</p>
              <p className="text-sm mt-1">
                {fCoeff > 0.0625 
                  ? 'DİKKAT: Bu eşleşme yüksek akrabalık riski taşıyor. Yavrularda genetik kusur veya düşük verim görülme ihtimali yüksektir. Başka bir boğa seçmeniz önerilir.'
                  : 'Bu eşleşme güvenlidir. İki hayvan arasında yakın bir akrabalık tespit edilmedi.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-earth-100 dark:border-gray-700">
            <button 
              onClick={handleSavePlan}
              className="flex items-center space-x-2 bg-nature-600 hover:bg-nature-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Planı Kaydet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatingPlanner;
