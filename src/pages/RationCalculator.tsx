import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveFarmQuery } from '../hooks/useLiveFarmQuery';
import { db } from '../lib/db';
import { useStore } from '../store/useStore';
import { Calculator, Plus, X, Activity, Droplets, Beef } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Sabit boş dizi referansları — her render'da yeni [] oluşturmayı önler.
// useLiveFarmQuery undefined döndürdüğünde (yüklenirken) || [] kullanmak
// her render'da yeni referans oluşturur ve useEffect sonsuz döngüye girer.
const EMPTY_ARRAY: never[] = [];

// ProgressBar bileşeni dışarıda tanımlanmalı.
// İçerde tanımlanırsa her render'da yeni referans → React unmount/remount → beyaz ekran.
const ProgressBar = ({ current, target, label, unit }: { current: number, target: number, label: string, unit: string }) => {
  const validCurrent = isNaN(current) || !isFinite(current) ? 0 : current;
  const validTarget = isNaN(target) || !isFinite(target) || target <= 0 ? 1 : target;

  const percent = Math.min(Math.round((validCurrent / validTarget) * 100), 100);
  const isDeficient = percent < 90;
  const isExcess = percent > 110;

  let color = 'bg-nature-500';
  if (isDeficient) color = 'bg-yellow-500';
  if (isExcess) color = 'bg-red-500';

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <span className="font-bold text-earth-800 dark:text-gray-200 text-sm">{label}</span>
        <span className="text-xs font-bold text-earth-500 dark:text-gray-400">
          {validCurrent.toFixed(1)} / {validTarget.toFixed(1)} {unit}
        </span>
      </div>
      <div className="w-full bg-earth-100 dark:bg-gray-800 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

const RationCalculator: React.FC = () => {
  // useLiveFarmQuery undefined döndürdüğünde EMPTY_ARRAY kullan (sabit referans)
  const gruplarRaw = useLiveFarmQuery(() => db.gruplar.toArray());
  const yemlerRaw = useLiveFarmQuery(() => db.yemler.toArray());
  const hayvanlarRaw = useLiveFarmQuery(() => db.hayvanlar.toArray());

  const gruplar = gruplarRaw ?? EMPTY_ARRAY;
  const yemler = yemlerRaw ?? EMPTY_ARRAY;
  const hayvanlar = hayvanlarRaw ?? EMPTY_ARRAY;

  const [selectedYemToAdd, setSelectedYemToAdd] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

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

  // Son hesaplanan ortalama ağırlığı takip et — aynı değeri tekrar set etme
  const lastAvgRef = useRef<number | null>(null);

  // Grup seçildiğinde ortalama ağırlığı hesapla
  // ÖNEMLI: hayvanlar'ı dependency olarak eklemek ZORUNLU değil;
  // selectedGrupId değiştiğinde hayvanlar zaten mevcut veriden okunuyor.
  // hayvanlarRaw'ı (asıl sorgu sonucu) dependency olarak kullan,
  // böylece sabit EMPTY_ARRAY referansı sonsuz döngü yaratmaz.
  useEffect(() => {
    if (!selectedGrupId) return;
    const gruptakiHayvanlar = hayvanlar.filter(h => h && h.grupId === selectedGrupId);
    if (gruptakiHayvanlar.length > 0) {
      const totalWeight = gruptakiHayvanlar.reduce((sum, h) => sum + (Number(h.guncelAgirlikKg) || 0), 0);
      const avg = Math.round(totalWeight / gruptakiHayvanlar.length);
      // Aynı değeri tekrar set etme — sonsuz döngüyü kırar
      if (avg > 0 && avg !== lastAvgRef.current) {
        lastAvgRef.current = avg;
        setAvgWeight(avg);
      }
    }
  }, [selectedGrupId, hayvanlarRaw, setAvgWeight]); // hayvanlarRaw: gerçek veri değişince tetikle

  // İhtiyaç Hesaplama Fonksiyonları
  const hedefIhtiyac = useMemo(() => {
    let hedefDMI = 0;
    let hedefME = 0;
    let hedefHP_g = 0;

    const weight = Number(avgWeight) || 600;
    const milk = Number(milkYield) || 0;
    const dailyAdg = Number(adg) || 0;

    const yasamaPayiME = 0.122 * Math.pow(Math.max(weight, 1), 0.75);

    if (verimYonu === 'Sütçü') {
      hedefDMI = weight * 0.032;
      hedefME = yasamaPayiME + (milk * 0.74);
      hedefHP_g = 400 + (milk * 85);
    } else {
      hedefDMI = weight * 0.023;
      hedefME = yasamaPayiME + ((dailyAdg / 1000) * 4.5);
      hedefHP_g = 400 + ((dailyAdg / 1000) * 320);
    }

    const safeDMI = hedefDMI > 0 ? hedefDMI : 1;
    const hedefHP_Yuzde = (hedefHP_g / (safeDMI * 1000)) * 100;
    const hedefCa = safeDMI * 0.006 * 1000;
    const hedefP = safeDMI * 0.004 * 1000;

    return {
      dmi: isNaN(hedefDMI) || !isFinite(hedefDMI) ? 0 : hedefDMI,
      me: isNaN(hedefME) || !isFinite(hedefME) ? 0 : hedefME,
      hp_g: isNaN(hedefHP_g) || !isFinite(hedefHP_g) ? 0 : hedefHP_g,
      hp_yuzde: isNaN(hedefHP_Yuzde) || !isFinite(hedefHP_Yuzde) ? 0 : hedefHP_Yuzde,
      ca: isNaN(hedefCa) || !isFinite(hedefCa) ? 0 : hedefCa,
      p: isNaN(hedefP) || !isFinite(hedefP) ? 0 : hedefP
    };
  }, [avgWeight, milkYield, adg, verimYonu]);

  // Sağlanan Toplamları Hesaplama
  const toplamSaglanan = useMemo(() => {
    let dmi = 0, me = 0, hp_g = 0, ca_g = 0, p_g = 0;
    let kabaKm = 0, kesifKm = 0, vitMinKm = 0;

    const list = Array.isArray(rasyonListesi) ? rasyonListesi : EMPTY_ARRAY;
    list.forEach(item => {
      if (!item) return;
      const yem = yemler.find(y => y && y.id === item.yemId);
      if (yem && yem.kmYuzde) {
        const kg = Number(item.kgAsFed) || 0;
        const kuruMaddeKg = kg * ((Number(yem.kmYuzde) || 0) / 100);
        dmi += kuruMaddeKg;
        me += kuruMaddeKg * (Number(yem.meMcalKg) || 0);
        hp_g += kuruMaddeKg * 1000 * ((Number(yem.hpYuzde) || 0) / 100);
        ca_g += kuruMaddeKg * 1000 * ((Number(yem.caYuzde) || 0) / 100);
        p_g += kuruMaddeKg * 1000 * ((Number(yem.pYuzde) || 0) / 100);

        if (yem.tur === 'Kaba Yem') {
          kabaKm += kuruMaddeKg;
        } else if (yem.tur === 'Kesif Yem') {
          kesifKm += kuruMaddeKg;
        } else if (yem.tur === 'Mineral/Vitamin' || yem.tur === 'Sıvı Takviye') {
          vitMinKm += kuruMaddeKg;
        }
      }
    });

    const hp_yuzde = dmi > 0 ? (hp_g / (dmi * 1000)) * 100 : 0;

    return {
      dmi: isNaN(dmi) || !isFinite(dmi) ? 0 : dmi,
      me: isNaN(me) || !isFinite(me) ? 0 : me,
      hp_g: isNaN(hp_g) || !isFinite(hp_g) ? 0 : hp_g,
      hp_yuzde: isNaN(hp_yuzde) || !isFinite(hp_yuzde) ? 0 : hp_yuzde,
      ca: isNaN(ca_g) || !isFinite(ca_g) ? 0 : ca_g,
      p: isNaN(p_g) || !isFinite(p_g) ? 0 : p_g,
      kabaKm: isNaN(kabaKm) || !isFinite(kabaKm) ? 0 : kabaKm,
      kesifKm: isNaN(kesifKm) || !isFinite(kesifKm) ? 0 : kesifKm,
      vitMinKm: isNaN(vitMinKm) || !isFinite(vitMinKm) ? 0 : vitMinKm
    };
  }, [rasyonListesi, yemlerRaw]); // yemlerRaw: gerçek veri değişince tetikle

  const addYem = (yemId: string) => {
    if (!yemId) return;
    const list = Array.isArray(rasyonListesi) ? rasyonListesi : EMPTY_ARRAY;
    if (list.some(r => r && r.yemId === yemId)) return;
    setRasyonListesi([...list, { id: uuidv4(), yemId, kgAsFed: 1, minKg: undefined, maxKg: undefined }]);
  };

  const updateYemProp = (id: string, prop: 'kgAsFed' | 'minKg' | 'maxKg', value: number | undefined) => {
    const list = Array.isArray(rasyonListesi) ? rasyonListesi : EMPTY_ARRAY;
    setRasyonListesi(list.map(r => r && r.id === id ? { ...r, [prop]: value } : r));
  };

  const removeYem = (id: string) => {
    const list = Array.isArray(rasyonListesi) ? rasyonListesi : EMPTY_ARRAY;
    setRasyonListesi(list.filter(r => r && r.id !== id));
  };

  const safeRasyonListesi = Array.isArray(rasyonListesi) ? rasyonListesi : EMPTY_ARRAY;

  const handleOptimize = () => {
    if (safeRasyonListesi.length === 0) {
      alert("Lütfen önce rasyona yem ekleyin.");
      return;
    }
    setIsOptimizing(true);

    setTimeout(() => {
      const calculateMetrics = (ration: typeof safeRasyonListesi) => {
        let dmi = 0, me = 0, hp_g = 0, cost = 0;
        ration.forEach(r => {
          const y = yemler.find(yem => yem && yem.id === r.yemId);
          if (y && y.kmYuzde) {
            const kg = r.kgAsFed;
            const kuruMaddeKg = kg * (y.kmYuzde / 100);
            dmi += kuruMaddeKg;
            me += kuruMaddeKg * (y.meMcalKg || 0);
            hp_g += kuruMaddeKg * 1000 * ((y.hpYuzde || 0) / 100);
            cost += kg * (y.birimFiyat || 0);
          }
        });
        return { dmi, me, hp_g, cost };
      };

      let bestRation = safeRasyonListesi.map(r => {
        let kg = r.kgAsFed;
        if (r.minKg !== undefined && kg < r.minKg) kg = r.minKg;
        if (r.maxKg !== undefined && kg > r.maxKg) kg = r.maxKg;
        return { ...r, kgAsFed: kg };
      });

      const getScore = (metrics: { dmi: number, me: number, hp_g: number, cost: number }) => {
        // Yüzdesel oranlar (1 = %100 tam karşılama)
        const meRatio = hedefIhtiyac.me > 0 ? metrics.me / hedefIhtiyac.me : 1;
        const hpRatio = hedefIhtiyac.hp_g > 0 ? metrics.hp_g / hedefIhtiyac.hp_g : 1;
        const dmiRatio = hedefIhtiyac.dmi > 0 ? metrics.dmi / hedefIhtiyac.dmi : 1;

        let penalty = 0;

        // 1. ÖNCELİK: ME (Enerji) ve HP (Protein)
        // Eksikliklerine devasa ceza (100.000 çarpan), fazlalıklarına israf cezası (10.000 çarpan)
        if (meRatio < 1) penalty += Math.pow((1 - meRatio) * 100, 2) * 100000;
        else penalty += Math.pow((meRatio - 1) * 100, 2) * 10000;

        if (hpRatio < 1) penalty += Math.pow((1 - hpRatio) * 100, 2) * 100000;
        else penalty += Math.pow((hpRatio - 1) * 100, 2) * 10000;

        // 2. ÖNCELİK: KMT (Kuru Madde Tüketimi)
        // Kullanıcı isteği: KMT cezası uygulansın ancak HP ve ME'den az olsun (10.000 çarpan)
        if (dmiRatio < 1) penalty += Math.pow((1 - dmiRatio) * 100, 2) * 10000;
        else penalty += Math.pow((dmiRatio - 1) * 100, 2) * 10000;

        // KMT fiziksel sınırı (Hayvan midesi %5'ten fazla aşılırsa devasa ceza)
        if (dmiRatio > 1.05) penalty += Math.pow((dmiRatio - 1.05) * 100, 2) * 500000;

        // 3. ÖNCELİK: MALİYET
        // Hedefler tutturulduğunda devasa cezalar 0'a yaklaşır, geriye maliyet minimizasyonu kalır
        penalty += metrics.cost;

        return -penalty;
      };

      let bestScore = getScore(calculateMetrics(bestRation));

      for (let i = 0; i < 10000; i++) {
        const candidate = bestRation.map(r => ({ ...r }));
        const idx = Math.floor(Math.random() * candidate.length);
        const change = (Math.random() - 0.5) * 1.5; // -0.75 to +0.75 kg
        
        let newKg = candidate[idx].kgAsFed + change;
        
        // Uygula: Min ve Max kısıtları
        const minLimit = candidate[idx].minKg !== undefined ? candidate[idx].minKg! : 0.1;
        const maxLimit = candidate[idx].maxKg !== undefined ? candidate[idx].maxKg! : Infinity;
        
        newKg = Math.max(minLimit, Math.min(newKg, maxLimit));
        candidate[idx].kgAsFed = newKg;

        const metrics = calculateMetrics(candidate);
        const score = getScore(metrics);

        if (score > bestScore) {
          bestScore = score;
          bestRation = candidate;
        }
      }

      setRasyonListesi(bestRation.map(r => ({ ...r, kgAsFed: Number(r.kgAsFed.toFixed(2)) })));
      setIsOptimizing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-earth-900 dark:text-gray-100 tracking-tight flex items-center">
            <Calculator className="w-7 h-7 sm:w-8 sm:h-8 mr-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span>Rasyon Hesaplama</span>
          </h1>
          <p className="text-earth-500 dark:text-gray-400 font-medium text-sm sm:text-base mt-0.5">Grup ihtiyaçlarına göre rasyon formüle edin</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Panel: Parametreler */}
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-6 lg:col-span-1">
          <h2 className="font-bold text-lg text-earth-900 dark:text-gray-100 border-b pb-2">1. Hedef Parametreleri</h2>

          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Hedef Grup</label>
            <select
              value={selectedGrupId}
              onChange={(e) => setSelectedGrupId(e.target.value)}
              className="w-full p-2.5 border border-earth-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 font-medium text-sm"
            >
              <option value="">Grup Seçin...</option>
              {gruplar.map(g => (
                <option key={g.id} value={g.id}>{g.ad} ({g.tur})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Verim Yönü</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setVerimYonu('Sütçü')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center transition ${verimYonu === 'Sütçü' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 border-2 border-purple-500' : 'bg-earth-50 dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-2 border-transparent'}`}
              >
                <Droplets className="w-4 h-4 mr-2" /> Sütçü
              </button>
              <button
                onClick={() => setVerimYonu('Etçi')}
                className={`flex-1 py-2 px-3 rounded-lg font-bold flex items-center justify-center transition ${verimYonu === 'Etçi' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-2 border-red-500' : 'bg-earth-50 dark:bg-gray-900 text-earth-600 dark:text-gray-400 border-2 border-transparent'}`}
              >
                <Beef className="w-4 h-4 mr-2" /> Etçi
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Ort. Canlı Ağırlık (Kg)</label>
            <input type="number" value={avgWeight} onChange={e => setAvgWeight(Number(e.target.value))} className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-bold" />
          </div>

          {verimYonu === 'Sütçü' ? (
            <div>
              <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Hedef Süt Verimi (Litre/Gün)</label>
              <input type="number" value={milkYield} onChange={e => setMilkYield(Number(e.target.value))} className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-bold" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-earth-700 dark:text-gray-300 mb-1">Hedef Ağırlık Artışı (GCAA - gr/Gün)</label>
              <input type="number" value={adg} onChange={e => setAdg(Number(e.target.value))} step="100" className="w-full p-2 border border-earth-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-bold" />
            </div>
          )}

          <div className="bg-earth-50 dark:bg-gray-900 p-4 rounded-xl border border-earth-200 dark:border-gray-700 mt-4">
            <h3 className="font-bold text-earth-800 dark:text-gray-200 text-sm mb-3">Hesaplanan Hedef İhtiyaç</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-earth-500 dark:text-gray-400">Kuru Madde (KM):</span> <span className="font-bold">{hedefIhtiyac.dmi.toFixed(1)} kg</span></div>
              <div className="flex justify-between"><span className="text-earth-500 dark:text-gray-400">Enerji (ME):</span> <span className="font-bold">{hedefIhtiyac.me.toFixed(1)} Mcal</span></div>
              <div className="flex justify-between"><span className="text-earth-500 dark:text-gray-400">Ham Protein (HP):</span> <span className="font-bold">{hedefIhtiyac.hp_g.toFixed(0)} gr (%{hedefIhtiyac.hp_yuzde.toFixed(1)})</span></div>
            </div>
          </div>
        </div>

        {/* Orta Panel: Yem Listesi */}
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-4 lg:col-span-1">
          <h2 className="font-bold text-lg text-earth-900 dark:text-gray-100 border-b pb-2 flex justify-between items-center">
            2. Rasyona Yem Ekle
          </h2>

          <div className="flex space-x-2">
            <select
              value={selectedYemToAdd}
              onChange={(e) => setSelectedYemToAdd(e.target.value)}
              className="flex-1 min-w-0 truncate p-2 border border-earth-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 font-medium text-sm"
            >
              <option value="">Yem Seçin...</option>
              {yemler.filter(y => y).map(y => (
                <option key={y.id} value={y.id}>
                  {y.ad} {y.kmYuzde === undefined || y.kmYuzde === 0 ? '(Besin Değeri Eksik)' : `(Stok: ${y.stokKg || 0}kg)`}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (selectedYemToAdd) {
                  addYem(selectedYemToAdd);
                  setSelectedYemToAdd('');
                }
              }}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 mt-4 max-h-[400px] lg:max-h-[600px] xl:max-h-[700px] overflow-y-auto custom-scrollbar pr-1">
            {safeRasyonListesi.length === 0 ? (
              <div className="text-center py-6 text-earth-400 text-sm">Henüz yem eklenmedi.</div>
            ) : (
              safeRasyonListesi.map(r => {
                if (!r) return null;
                const y = yemler.find(yem => yem && yem.id === r.yemId);
                if (!y) return null;
                return (
                  <div key={r.id} className="p-3 border border-earth-200 dark:border-gray-700 rounded-xl bg-earth-50 dark:bg-gray-900 relative group">
                    <button onClick={() => removeYem(r.id)} className="absolute top-2 right-2 text-earth-400 hover:text-red-500 transition sm:opacity-0 group-hover:opacity-100 opacity-100 p-1">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="font-bold text-earth-800 dark:text-gray-200 text-sm">{y.ad}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={r.kgAsFed}
                          onChange={(e) => updateYemProp(r.id, 'kgAsFed', Number(e.target.value))}
                          className="w-20 p-1 border border-earth-300 dark:border-gray-600 rounded text-center font-bold outline-none bg-white dark:bg-gray-800"
                        />
                        <span className="text-xs text-earth-500 dark:text-gray-400">Taze Kg</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Min"
                          value={r.minKg !== undefined ? r.minKg : ''}
                          onChange={(e) => updateYemProp(r.id, 'minKg', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-16 p-1 border border-earth-300 dark:border-gray-600 rounded text-center text-xs outline-none bg-white dark:bg-gray-800 placeholder-gray-400"
                          title="Minimum kullanım kısıtı (opsiyonel)"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="Max"
                          value={r.maxKg !== undefined ? r.maxKg : ''}
                          onChange={(e) => updateYemProp(r.id, 'maxKg', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-16 p-1 border border-earth-300 dark:border-gray-600 rounded text-center text-xs outline-none bg-white dark:bg-gray-800 placeholder-gray-400"
                          title="Maksimum kullanım kısıtı (opsiyonel)"
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Sağ Panel: Sonuçlar */}
        <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-earth-200 dark:border-gray-700 space-y-4 lg:col-span-1">
          <h2 className="font-bold text-lg text-earth-900 dark:text-gray-100 border-b pb-2 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-nature-600 dark:text-nature-400" />
            3. Rasyon Çözümü
          </h2>

          <div className="space-y-2 mt-4">
            <ProgressBar current={toplamSaglanan.dmi} target={hedefIhtiyac.dmi} label="Kuru Madde Tüketimi" unit="kg" />
            <ProgressBar current={toplamSaglanan.me} target={hedefIhtiyac.me} label="Enerji (ME)" unit="Mcal" />
            <ProgressBar current={toplamSaglanan.hp_g} target={hedefIhtiyac.hp_g} label="Ham Protein (HP)" unit="gr" />
            <ProgressBar current={toplamSaglanan.ca} target={hedefIhtiyac.ca} label="Kalsiyum (Ca)" unit="gr" />
            <ProgressBar current={toplamSaglanan.p} target={hedefIhtiyac.p} label="Fosfor (P)" unit="gr" />
          </div>

          <div className="bg-nature-50 dark:bg-nature-900/30 p-4 rounded-xl border border-nature-200 dark:border-nature-800 mt-6">
            <h3 className="font-bold text-nature-800 dark:text-nature-200 text-sm mb-3">Rasyon Kompozisyonu</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-nature-100 dark:border-nature-800">
                <span className="block text-xs font-bold text-nature-500 dark:text-nature-400 mb-1">Kaba / Kesif Yem Oranı</span>
                <span className="text-lg font-black text-nature-700 dark:text-nature-300">
                  {(() => {
                    const totalKabaKesif = toplamSaglanan.kabaKm + toplamSaglanan.kesifKm;
                    if (totalKabaKesif === 0) return '%0 / %0';
                    const kabaYuzde = Math.round((toplamSaglanan.kabaKm / totalKabaKesif) * 100);
                    const kesifYuzde = Math.round((toplamSaglanan.kesifKm / totalKabaKesif) * 100);
                    return `%${kabaYuzde} / %${kesifYuzde}`;
                  })()}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-nature-100 dark:border-nature-800">
                <span className="block text-xs font-bold text-nature-500 dark:text-nature-400 mb-1">Vit/Min (KM Oranı)</span>
                <span className="text-lg font-black text-nature-700 dark:text-nature-300">
                  {(() => {
                    if (toplamSaglanan.dmi === 0) return '%0.0';
                    return `%${((toplamSaglanan.vitMinKm / toplamSaglanan.dmi) * 100).toFixed(1)}`;
                  })()}
                </span>
              </div>
            </div>

            <h3 className="font-bold text-nature-800 dark:text-nature-200 text-sm mb-1 mt-4 border-t border-nature-200 dark:border-nature-800 pt-4">Rasyon Özeti</h3>
            <p className="text-xs text-nature-600 dark:text-nature-400 mb-4">
              Bu rasyonun kuru maddesindeki ham protein oranı <strong>%{toplamSaglanan.hp_yuzde.toFixed(1)}</strong> olarak hesaplanmıştır.
              {toplamSaglanan.hp_yuzde < hedefIhtiyac.hp_yuzde ? ' (Hedefin altında)' : ' (Hedef uygun)'}
            </p>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-3 mb-4 flex justify-between items-center">
              <span className="text-sm font-bold text-orange-800">Hayvan Başı Maliyet</span>
              <span className="text-xl font-black text-orange-600">
                {(() => {
                  try {
                    const total = safeRasyonListesi.reduce((sum, r) => {
                      if (!r) return sum;
                      const y = yemler.find(yem => yem && yem.id === r.yemId);
                      const price = Number(y?.birimFiyat) || 0;
                      const kg = Number(r.kgAsFed) || 0;
                      return sum + (price * kg);
                    }, 0);
                    return isNaN(total) || !isFinite(total) ? '0.00 ₺' : `${total.toFixed(2)} ₺`;
                  } catch (e) {
                    return '0.00 ₺';
                  }
                })()} <span className="text-xs text-orange-500 font-normal">/ Gün</span>
              </span>
            </div>

            <button
              onClick={handleOptimize}
              disabled={isOptimizing || safeRasyonListesi.length === 0}
              className="w-full py-2 mb-4 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg font-bold hover:bg-orange-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isOptimizing ? 'Optimizasyon Hesaplanıyor...' : 'Maliyeti Optimize Et (Akıllı Asistan)'}
            </button>

            <button
              onClick={async () => {
                if (!selectedGrupId) {
                  alert('Lütfen önce bir hedef grup seçin.');
                  return;
                }
                const summary = safeRasyonListesi.map(r => {
                  if (!r) return '';
                  const y = yemler.find(yem => yem && yem.id === r.yemId);
                  return y ? `${y.ad}: ${r.kgAsFed}kg` : '';
                }).filter(Boolean).join(', ');

                const rasyonGuncellemesi = {
                  rasyonAdi: `${verimYonu} Rasyonu`,
                  rasyonOzet: summary,
                  rasyonTarihi: new Date().toISOString()
                };

                // 1. Önce IndexedDB'yi güncelle
                await db.gruplar.update(selectedGrupId, rasyonGuncellemesi);

                // 2. syncQueue'ya ekle — Supabase'e de kaydedilsin
                const guncelGrup = await db.gruplar.get(selectedGrupId);
                if (guncelGrup) {
                  await db.syncQueue.add({
                    table: 'gruplar',
                    action: 'UPDATE',
                    payload: guncelGrup,
                    created_at: Date.now()
                  });

                  // 3. Çevrimiçiyse anında Supabase'e gönder
                  if (navigator.onLine) {
                    const { processSyncQueue } = await import('../services/syncService');
                    processSyncQueue();
                  }
                }

                alert('Rasyon başarıyla gruba atandı ve kaydedildi!');
              }}

              disabled={!selectedGrupId || safeRasyonListesi.length === 0}
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
