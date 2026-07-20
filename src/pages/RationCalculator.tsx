import React, { useEffect, useMemo } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { Calculator, Plus, X, Activity, Droplets, Beef } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
const RationCalculator: React.FC = () => {
  const gruplar = useLiveFarmQuery(() => db.gruplar.toArray()) || [];
  const yemler = useLiveFarmQuery(() => db.yemler.toArray()) || [];
  const hayvanlar = useLiveFarmQuery(() => db.hayvanlar.toArray()) || [];

  const {
    rationSelectedGrupId: selectedGrupId,
    setRationSelectedGrupId: setSelectedGrupId,
    rationVerimYonu: verimYonu,
    setRationVerimYonu: setVerimYonu,
    rationAvgWeight: avgWeight,
    setRationAvgWeight: setAvgWeight,
    rationMilkYield: milkYield,
    setRationMilkYield: setMilkYield,
    rationAdg: adg,
    setRationAdg: setAdg,
    rationListesi: rasyonListesi,
    setRationListesi: setRasyonListesi
  } = useStore();

  // Grup Seçildiğinde ortalama ağırlığı hesapla
  useEffect(() => {
    if (selectedGrupId) {
      const gruptakiHayvanlar = hayvanlar.filter(h => h.grupId === selectedGrupId);
      if (gruptakiHayvanlar.length > 0) {
        const totalWeight = gruptakiHayvanlar.reduce((sum, h) => sum + (h.guncelAgirlikKg || 0), 0);
        const avg = totalWeight / gruptakiHayvanlar.length;
        if (avg > 0) setAvgWeight(Math.round(avg));
      }
    }
  }, [selectedGrupId, hayvanlar]);

  // İhtiyaç Hesaplama Fonksiyonları
  const hedefIhtiyac = useMemo(() => {
    // Kuru Madde Kapasitesi (Canlı Ağırlığın %2.5 - %3.5'i arası, sütçü/etçiye göre değişir)
    // Sütçü için yüksek verimde %3.2, Etçi için %2.2 varsayalım
    let hedefDMI = 0;
    let hedefME = 0; // Mcal/gün
    let hedefHP_g = 0; // gram/gün
    
    // Yaşama Payı ME (Mcal) = 0.122 * BW^0.75
    const yasamaPayiME = 0.122 * Math.pow(avgWeight, 0.75);
    
    if (verimYonu === 'Sütçü') {
      hedefDMI = avgWeight * 0.032; // BW'nin %3.2'si
      // Süt verim payı: ~0.7 Mcal / Litre süt
      hedefME = yasamaPayiME + (milkYield * 0.74);
      // HP İhtiyacı: Yaşama payı ~400g + Süt protein payı (~85g/Litre)
      hedefHP_g = 400 + (milkYield * 85);
    } else {
      hedefDMI = avgWeight * 0.023; // Besi danası BW'nin %2.3'ü civarı
      // Büyüme payı: Her 1 kg ADG için ~4.5 Mcal
      hedefME = yasamaPayiME + ((adg / 1000) * 4.5);
      // HP İhtiyacı: Yaşama payı + ADG başına protein
      hedefHP_g = 400 + ((adg / 1000) * 320);
    }

    const hedefHP_Yuzde = (hedefHP_g / (hedefDMI * 1000)) * 100;
    const hedefCa = hedefDMI * 0.006 * 1000; // gram
    const hedefP = hedefDMI * 0.004 * 1000; // gram

    return {
      dmi: hedefDMI,
      me: hedefME,
      hp_g: hedefHP_g,
      hp_yuzde: hedefHP_Yuzde,
      ca: hedefCa,
      p: hedefP
    };
  }, [avgWeight, milkYield, adg, verimYonu]);

  // Sağlanan Toplamları Hesaplama
  const toplamSaglanan = useMemo(() => {
    let dmi = 0;
    let me = 0;
    let hp_g = 0;
    let ca_g = 0;
    let p_g = 0;

    rasyonListesi.forEach(item => {
      const yem = yemler.find(y => y.id === item.yemId);
      if (yem && yem.kmYuzde) {
        const kuruMaddeKg = item.kgAsFed * (yem.kmYuzde / 100);
        dmi += kuruMaddeKg;
        
        me += kuruMaddeKg * (yem.meMcalKg || 0);
        hp_g += kuruMaddeKg * 1000 * ((yem.hpYuzde || 0) / 100);
        ca_g += kuruMaddeKg * 1000 * ((yem.caYuzde || 0) / 100);
        p_g += kuruMaddeKg * 1000 * ((yem.pYuzde || 0) / 100);
      }
    });

    return {
      dmi,
      me,
      hp_g,
      hp_yuzde: dmi > 0 ? (hp_g / (dmi * 1000)) * 100 : 0,
      ca: ca_g,
      p: p_g
    };
  }, [rasyonListesi, yemler]);

  const addYem = (yemId: string) => {
    if (!yemId) return;
    if (rasyonListesi.some(r => r.yemId === yemId)) return;
    
    setRasyonListesi([...rasyonListesi, { id: uuidv4(), yemId, kgAsFed: 1 }]);
  };

  const updateYemKg = (id: string, kg: number) => {
    setRasyonListesi(rasyonListesi.map(r => r.id === id ? { ...r, kgAsFed: kg } : r));
  };

  const removeYem = (id: string) => {
    setRasyonListesi(rasyonListesi.filter(r => r.id !== id));
  };

  const ProgressBar = ({ current, target, label, unit }: { current: number, target: number, label: string, unit: string }) => {
    const percent = Math.min(Math.round((current / (target || 1)) * 100), 100);
    const isDeficient = percent < 90;
    const isExcess = percent > 110;

    let color = 'bg-nature-500';
    if (isDeficient) color = 'bg-yellow-500';
    if (isExcess) color = 'bg-red-500';

    return (
      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="font-bold text-earth-800 text-sm">{label}</span>
          <span className="text-xs font-bold text-earth-500">
            {current.toFixed(1)} / {target.toFixed(1)} {unit}
          </span>
        </div>
        <div className="w-full bg-earth-100 rounded-full h-2.5">
          <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-earth-900 tracking-tight flex items-center">
            <Calculator className="w-8 h-8 mr-3 text-purple-600" />
            Rasyon Hesaplama
          </h1>
          <p className="text-earth-500 font-medium mt-1">Grup ihtiyaçlarına göre rasyon formüle edin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel: Parametreler */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-6 lg:col-span-1">
          <h2 className="font-bold text-lg text-earth-900 border-b pb-2">1. Hedef Parametreleri</h2>
          
          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Hedef Grup</label>
            <select 
              value={selectedGrupId}
              onChange={(e) => setSelectedGrupId(e.target.value)}
              className="w-full p-2 border border-earth-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Grup Seçin...</option>
              {gruplar.map(g => (
                <option key={g.id} value={g.id}>{g.ad} ({g.tur})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Verim Yönü</label>
            <div className="flex space-x-2">
              <button 
                onClick={() => setVerimYonu('Sütçü')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center transition ${verimYonu === 'Sütçü' ? 'bg-purple-100 text-purple-700 border-2 border-purple-500' : 'bg-earth-50 text-earth-600 border-2 border-transparent'}`}
              >
                <Droplets className="w-4 h-4 mr-2" /> Sütçü
              </button>
              <button 
                onClick={() => setVerimYonu('Etçi')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center transition ${verimYonu === 'Etçi' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-earth-50 text-earth-600 border-2 border-transparent'}`}
              >
                <Beef className="w-4 h-4 mr-2" /> Etçi
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 mb-1">Ort. Canlı Ağırlık (Kg)</label>
            <input type="number" value={avgWeight} onChange={e => setAvgWeight(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
          </div>

          {verimYonu === 'Sütçü' ? (
            <div>
              <label className="block text-sm font-bold text-earth-700 mb-1">Hedef Süt Verimi (Litre/Gün)</label>
              <input type="number" value={milkYield} onChange={e => setMilkYield(Number(e.target.value))} className="w-full p-2 border border-earth-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-earth-700 mb-1">Hedef Ağırlık Artışı (GCAA - gr/Gün)</label>
              <input type="number" value={adg} onChange={e => setAdg(Number(e.target.value))} step="100" className="w-full p-2 border border-earth-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          )}

          <div className="bg-earth-50 p-4 rounded-xl border border-earth-200 mt-4">
            <h3 className="font-bold text-earth-800 text-sm mb-3">Hesaplanan Hedef İhtiyaç</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-earth-500">Kuru Madde (KM):</span> <span className="font-bold">{hedefIhtiyac.dmi.toFixed(1)} kg</span></div>
              <div className="flex justify-between"><span className="text-earth-500">Enerji (ME):</span> <span className="font-bold">{hedefIhtiyac.me.toFixed(1)} Mcal</span></div>
              <div className="flex justify-between"><span className="text-earth-500">Ham Protein (HP):</span> <span className="font-bold">{hedefIhtiyac.hp_g.toFixed(0)} gr (%{hedefIhtiyac.hp_yuzde.toFixed(1)})</span></div>
            </div>
          </div>
        </div>

        {/* Orta Panel: Yem Listesi */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-4 lg:col-span-1">
          <h2 className="font-bold text-lg text-earth-900 border-b pb-2 flex justify-between items-center">
            2. Rasyona Yem Ekle
          </h2>
          
          <div className="flex space-x-2">
            <select 
              id="yemSelect"
              className="flex-1 min-w-0 truncate p-2 border border-earth-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Yem Seçin...</option>
              {yemler.filter(y => y.kmYuzde !== undefined).map(y => (
                <option key={y.id} value={y.id}>{y.ad} (Stok: {y.stokKg}kg)</option>
              ))}
            </select>
            <button 
              onClick={() => {
                const sel = document.getElementById('yemSelect') as HTMLSelectElement;
                addYem(sel.value);
                sel.value = '';
              }}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
            {rasyonListesi.length === 0 ? (
              <div className="text-center py-6 text-earth-400 text-sm">Henüz yem eklenmedi.</div>
            ) : (
              rasyonListesi.map(r => {
                const y = yemler.find(yem => yem.id === r.yemId);
                if (!y) return null;
                return (
                  <div key={r.id} className="p-3 border border-earth-200 rounded-xl bg-earth-50 relative group">
                    <button onClick={() => removeYem(r.id)} className="absolute top-2 right-2 text-earth-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="font-bold text-earth-800 text-sm">{y.ad}</div>
                    <div className="flex items-center space-x-2 mt-2">
                      <input 
                        type="number" 
                        step="0.1" 
                        min="0"
                        value={r.kgAsFed} 
                        onChange={(e) => updateYemKg(r.id, Number(e.target.value))}
                        className="w-20 p-1 border border-earth-300 rounded text-center font-bold outline-none"
                      />
                      <span className="text-xs text-earth-500">Taze Kg / Hayvan</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Sağ Panel: Sonuçlar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-earth-200 space-y-4 lg:col-span-1">
          <h2 className="font-bold text-lg text-earth-900 border-b pb-2 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-nature-600" />
            3. Rasyon Çözümü
          </h2>
          
          <div className="space-y-2 mt-4">
            <ProgressBar current={toplamSaglanan.dmi} target={hedefIhtiyac.dmi} label="Kuru Madde Tüketimi" unit="kg" />
            <ProgressBar current={toplamSaglanan.me} target={hedefIhtiyac.me} label="Enerji (ME)" unit="Mcal" />
            <ProgressBar current={toplamSaglanan.hp_g} target={hedefIhtiyac.hp_g} label="Ham Protein (HP)" unit="gr" />
            <ProgressBar current={toplamSaglanan.ca} target={hedefIhtiyac.ca} label="Kalsiyum (Ca)" unit="gr" />
            <ProgressBar current={toplamSaglanan.p} target={hedefIhtiyac.p} label="Fosfor (P)" unit="gr" />
          </div>

          <div className="bg-nature-50 p-4 rounded-xl border border-nature-200 mt-6">
            <h3 className="font-bold text-nature-800 text-sm mb-1">Rasyon Özeti</h3>
            <p className="text-xs text-nature-600 mb-4">
              Bu rasyonun kuru maddesindeki ham protein oranı <strong>%{toplamSaglanan.hp_yuzde.toFixed(1)}</strong> olarak hesaplanmıştır. 
              {toplamSaglanan.hp_yuzde < hedefIhtiyac.hp_yuzde ? ' (Hedefin altında)' : ' (Hedef uygun)'}
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex justify-between items-center">
              <span className="text-sm font-bold text-orange-800">Hayvan Başı Maliyet</span>
              <span className="text-xl font-black text-orange-600">
                {rasyonListesi.reduce((sum, r) => {
                  const y = yemler.find(yem => yem.id === r.yemId);
                  return sum + (y ? y.birimFiyat * r.kgAsFed : 0);
                }, 0).toLocaleString('tr-TR', {style:'currency', currency:'TRY'})} <span className="text-xs text-orange-500 font-normal">/ Gün</span>
              </span>
            </div>
            <button 
              onClick={async () => {
                if (!selectedGrupId) {
                  alert('Lütfen önce bir hedef grup seçin.');
                  return;
                }
                const summary = rasyonListesi.map(r => {
                  const y = yemler.find(yem => yem.id === r.yemId);
                  return y ? `${y.ad}: ${r.kgAsFed}kg` : '';
                }).filter(Boolean).join(', ');
                
                await db.gruplar.update(selectedGrupId, {
                  rasyonAdi: `${verimYonu} Rasyonu`,
                  rasyonOzet: summary,
                  rasyonTarihi: new Date().toISOString()
                });
                alert('Rasyon başarıyla gruba atandı!');
              }}
              disabled={!selectedGrupId || rasyonListesi.length === 0}
              className="w-full py-2 bg-nature-600 text-white rounded-lg font-bold hover:bg-nature-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rasyonu Gruba Ata
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RationCalculator;
